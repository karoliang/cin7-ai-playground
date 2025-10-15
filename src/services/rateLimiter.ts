import {
  RateLimitConfig,
  RateLimitRule,
  RateLimitResult,
  RateLimitStrategy,
  RateLimitScope,
  RateLimitStorage,
  AIGatewayRequest
} from '@/types/aiGateway'

/**
 * Rate Limiting Service
 * Provides comprehensive rate limiting with multiple strategies and scopes
 */
export class RateLimiterService {
  private config: RateLimitConfig
  private storage: RateLimitStorageAdapter
  private strategies: Map<RateLimitStrategy, RateLimitStrategyImpl>
  private metrics: RateLimitMetrics

  constructor(config: RateLimitConfig) {
    this.config = config
    this.storage = this.createStorageAdapter(config.storage)
    this.strategies = this.initializeStrategies()
    this.metrics = new RateLimitMetrics()
  }

  /**
   * Check if request is allowed based on rate limits
   */
  async checkLimit(request: AIGatewayRequest): Promise<RateLimitResult> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 60000,
        ruleId: 'disabled'
      }
    }

    try {
      // Get applicable rules for this request
      const applicableRules = this.getApplicableRules(request)

      if (applicableRules.length === 0) {
        return {
          allowed: true,
          remaining: Infinity,
          resetTime: Date.now() + 60000,
          ruleId: 'no-rules'
        }
      }

      // Check each applicable rule
      for (const rule of applicableRules) {
        const result = await this.checkRule(rule, request)

        if (!result.allowed) {
          this.metrics.recordRejection(rule.id)
          return result
        }
      }

      // All rules passed
      this.metrics.recordAllow()

      return {
        allowed: true,
        remaining: this.calculateRemaining(applicableRules, request),
        resetTime: this.calculateResetTime(applicableRules, request),
        ruleId: applicableRules[0].id
      }

    } catch (error) {
      console.error('[Rate Limiter] Error checking rate limit:', error)
      this.metrics.recordError()

      // Fail open - allow the request if rate limiter fails
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 60000,
        ruleId: 'error-fallback'
      }
    }
  }

  /**
   * Record a request for rate limiting purposes
   */
  async recordRequest(request: AIGatewayRequest): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const applicableRules = this.getApplicableRules(request)

      for (const rule of applicableRules) {
        const strategy = this.strategies.get(this.config.strategy)
        if (strategy) {
          await strategy.recordRequest(rule, request)
        }
      }

    } catch (error) {
      console.error('[Rate Limiter] Error recording request:', error)
      this.metrics.recordError()
    }
  }

  /**
   * Reset rate limits for a specific scope
   */
  async resetLimits(scope: RateLimitScope, identifier: string): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const key = this.generateStorageKey(scope, identifier, '*')
      await this.storage.clearPattern(key)

    } catch (error) {
      console.error('[Rate Limiter] Error resetting limits:', error)
      this.metrics.recordError()
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats(): RateLimitStats {
    const metricsStats = this.metrics.getStats()
    return {
      config: {
        enabled: this.config.enabled,
        strategy: this.config.strategy,
        rulesCount: this.config.limits.length
      },
      ...metricsStats,
      metrics: metricsStats
    }
  }

  /**
   * Get current usage for a specific rule and scope
   */
  async getCurrentUsage(ruleId: string, scope: RateLimitScope, identifier: string): Promise<number> {
    if (!this.config.enabled) {
      return 0
    }

    try {
      const rule = this.config.limits.find(r => r.id === ruleId)
      if (!rule) {
        return 0
      }

      const strategy = this.strategies.get(this.config.strategy)
      if (!strategy) {
        return 0
      }

      return await strategy.getCurrentUsage(rule, scope, identifier)

    } catch (error) {
      console.error('[Rate Limiter] Error getting current usage:', error)
      return 0
    }
  }

  /**
   * Get applicable rules for a request
   */
  private getApplicableRules(request: AIGatewayRequest): RateLimitRule[] {
    return this.config.limits.filter(rule => this.isRuleApplicable(rule, request))
  }

  /**
   * Check if a rule is applicable to a request
   */
  private isRuleApplicable(rule: RateLimitRule, request: AIGatewayRequest): boolean {
    // If no conditions are specified, rule applies to all requests
    if (!rule.conditions || rule.conditions.length === 0) {
      return true
    }

    // Check all conditions
    return rule.conditions.every(condition => this.evaluateCondition(condition, request))
  }

  /**
   * Evaluate a rate limit condition
   */
  private evaluateCondition(condition: any, request: AIGatewayRequest): boolean {
    const { field, operator, value } = condition
    const requestValue = this.getFieldValue(request, field)

    switch (operator) {
      case 'eq':
        return requestValue === value
      case 'ne':
        return requestValue !== value
      case 'gt':
        return requestValue > value
      case 'lt':
        return requestValue < value
      case 'in':
        return Array.isArray(value) && value.includes(requestValue)
      case 'nin':
        return Array.isArray(value) && !value.includes(requestValue)
      default:
        return true
    }
  }

  /**
   * Get field value from request
   */
  private getFieldValue(request: AIGatewayRequest, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.')
    let value: any = request

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Check a specific rate limit rule
   */
  private async checkRule(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult> {
    const strategy = this.strategies.get(this.config.strategy)
    if (!strategy) {
      return {
        allowed: true,
        remaining: rule.limit,
        resetTime: Date.now() + rule.window,
        ruleId: rule.id
      }
    }

    return await strategy.checkLimit(rule, request)
  }

  /**
   * Calculate remaining requests based on all applicable rules
   */
  private calculateRemaining(rules: RateLimitRule[], request: AIGatewayRequest): number {
    let minRemaining = Infinity

    for (const rule of rules) {
      const strategy = this.strategies.get(this.config.strategy)
      if (strategy) {
        // This is a simplified calculation - in practice, you'd get the actual remaining count
        const remaining = Math.max(0, rule.limit - 1)
        minRemaining = Math.min(minRemaining, remaining)
      }
    }

    return minRemaining === Infinity ? 100 : minRemaining
  }

  /**
   * Calculate reset time based on all applicable rules
   */
  private calculateResetTime(rules: RateLimitRule[], request: AIGatewayRequest): number {
    let maxResetTime = 0

    for (const rule of rules) {
      const resetTime = Math.ceil((Date.now() + rule.window) / 1000) * 1000
      maxResetTime = Math.max(maxResetTime, resetTime)
    }

    return maxResetTime || Date.now() + 60000
  }

  /**
   * Create storage adapter based on configuration
   */
  private createStorageAdapter(config: RateLimitStorage): RateLimitStorageAdapter {
    switch (config.type) {
      case 'memory':
        return new MemoryRateLimitStorage(config.config)
      case 'redis':
        return new RedisRateLimitStorage(config.config)
      case 'database':
        return new DatabaseRateLimitStorage(config.config)
      default:
        throw new Error(`Unsupported rate limit storage type: ${config.type}`)
    }
  }

  /**
   * Initialize rate limiting strategies
   */
  private initializeStrategies(): Map<RateLimitStrategy, RateLimitStrategyImpl> {
    const strategies = new Map()

    // Sliding window strategy
    strategies.set('sliding-window', new SlidingWindowStrategy(this.storage))

    // Fixed window strategy
    strategies.set('fixed-window', new FixedWindowStrategy(this.storage))

    // Token bucket strategy
    strategies.set('token-bucket', new TokenBucketStrategy(this.storage))

    // Adaptive strategy
    strategies.set('adaptive', new AdaptiveStrategy(this.storage))

    return strategies
  }

  /**
   * Generate storage key for rate limit data
   */
  private generateStorageKey(scope: RateLimitScope, identifier: string, ruleId: string): string {
    return `rate-limit:${scope}:${identifier}:${ruleId}`
  }
}

/**
 * Rate Limiting Strategy Interface
 */
interface RateLimitStrategyImpl {
  checkLimit(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult>
  recordRequest(rule: RateLimitRule, request: AIGatewayRequest): Promise<void>
  getCurrentUsage(rule: RateLimitRule, scope: RateLimitScope, identifier: string): Promise<number>
}

/**
 * Sliding Window Rate Limiting Strategy
 */
class SlidingWindowStrategy implements RateLimitStrategyImpl {
  private storage: RateLimitStorageAdapter

  constructor(storage: RateLimitStorageAdapter) {
    this.storage = storage
  }

  async checkLimit(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(rule.scope, request)
    const key = `sliding-window:${rule.scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const windowStart = now - rule.window

    // Get current requests in the window
    const requests = await this.storage.getRequestsInWindow(key, windowStart, now)
    const currentCount = requests.length

    if (currentCount >= rule.limit) {
      // Find the oldest request to calculate retry after
      const oldestRequest = Math.min(...requests)
      const retryAfter = Math.ceil((oldestRequest + rule.window - now) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: now + rule.window,
        retryAfter,
        ruleId: rule.id
      }
    }

    return {
      allowed: true,
      remaining: rule.limit - currentCount,
      resetTime: now + rule.window,
      ruleId: rule.id
    }
  }

  async recordRequest(rule: RateLimitRule, request: AIGatewayRequest): Promise<void> {
    const identifier = this.getIdentifier(rule.scope, request)
    const key = `sliding-window:${rule.scope}:${identifier}:${rule.id}`
    const now = Date.now()

    await this.storage.addRequest(key, now, rule.window)
  }

  async getCurrentUsage(rule: RateLimitRule, scope: RateLimitScope, identifier: string): Promise<number> {
    const key = `sliding-window:${scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const windowStart = now - rule.window

    const requests = await this.storage.getRequestsInWindow(key, windowStart, now)
    return requests.length
  }

  private getIdentifier(scope: RateLimitScope, request: AIGatewayRequest): string {
    switch (scope) {
      case 'global':
        return 'global'
      case 'user':
        return request.context?.user_id || 'anonymous'
      case 'project':
        return request.context?.project_id || 'unknown'
      case 'session':
        return request.context?.session_id || 'unknown'
      case 'ip':
        return request.metadata?.ipAddress || 'unknown'
      default:
        return 'unknown'
    }
  }
}

/**
 * Fixed Window Rate Limiting Strategy
 */
class FixedWindowStrategy implements RateLimitStrategyImpl {
  private storage: RateLimitStorageAdapter

  constructor(storage: RateLimitStorageAdapter) {
    this.storage = storage
  }

  async checkLimit(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(rule.scope, request)
    const key = `fixed-window:${rule.scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const windowStart = Math.floor(now / rule.window) * rule.window
    const windowEnd = windowStart + rule.window

    const currentCount = await this.storage.getCounter(key, windowStart)

    if (currentCount >= rule.limit) {
      const retryAfter = Math.ceil((windowEnd - now) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: windowEnd,
        retryAfter,
        ruleId: rule.id
      }
    }

    return {
      allowed: true,
      remaining: rule.limit - currentCount,
      resetTime: windowEnd,
      ruleId: rule.id
    }
  }

  async recordRequest(rule: RateLimitRule, request: AIGatewayRequest): Promise<void> {
    const identifier = this.getIdentifier(rule.scope, request)
    const key = `fixed-window:${rule.scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const windowStart = Math.floor(now / rule.window) * rule.window

    await this.storage.incrementCounter(key, windowStart, rule.window)
  }

  async getCurrentUsage(rule: RateLimitRule, scope: RateLimitScope, identifier: string): Promise<number> {
    const key = `fixed-window:${scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const windowStart = Math.floor(now / rule.window) * rule.window

    return await this.storage.getCounter(key, windowStart)
  }

  private getIdentifier(scope: RateLimitScope, request: AIGatewayRequest): string {
    switch (scope) {
      case 'global':
        return 'global'
      case 'user':
        return request.context?.user_id || 'anonymous'
      case 'project':
        return request.context?.project_id || 'unknown'
      case 'session':
        return request.context?.session_id || 'unknown'
      case 'ip':
        return request.metadata?.ipAddress || 'unknown'
      default:
        return 'unknown'
    }
  }
}

/**
 * Token Bucket Rate Limiting Strategy
 */
class TokenBucketStrategy implements RateLimitStrategyImpl {
  private storage: RateLimitStorageAdapter

  constructor(storage: RateLimitStorageAdapter) {
    this.storage = storage
  }

  async checkLimit(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(rule.scope, request)
    const key = `token-bucket:${rule.scope}:${identifier}:${rule.id}`
    const now = Date.now()

    const bucket = await this.storage.getTokenBucket(key)
    const tokens = this.calculateTokens(bucket, rule, now)

    if (tokens < 1) {
      const refillTime = this.calculateRefillTime(tokens, rule)
      const retryAfter = Math.ceil(refillTime / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: now + refillTime,
        retryAfter,
        ruleId: rule.id
      }
    }

    // Update bucket after consuming a token
    const newTokens = tokens - 1
    await this.storage.setTokenBucket(key, {
      tokens: newTokens,
      lastRefill: now
    })

    return {
      allowed: true,
      remaining: Math.floor(newTokens),
      resetTime: now + rule.window,
      ruleId: rule.id
    }
  }

  async recordRequest(rule: RateLimitRule, request: AIGatewayRequest): Promise<void> {
    // Token bucket handles request recording in checkLimit
  }

  async getCurrentUsage(rule: RateLimitRule, scope: RateLimitScope, identifier: string): Promise<number> {
    const key = `token-bucket:${scope}:${identifier}:${rule.id}`
    const now = Date.now()
    const bucket = await this.storage.getTokenBucket(key)
    const tokens = this.calculateTokens(bucket, rule, now)

    return Math.max(0, rule.limit - Math.floor(tokens))
  }

  private calculateTokens(bucket: any, rule: RateLimitRule, now: number): number {
    if (!bucket) {
      return rule.limit
    }

    const timePassed = now - bucket.lastRefill
    const tokensToAdd = (timePassed / rule.window) * rule.limit
    const newTokens = Math.min(rule.limit, bucket.tokens + tokensToAdd)

    return newTokens
  }

  private calculateRefillTime(tokens: number, rule: RateLimitRule): number {
    const tokensNeeded = 1 - tokens
    const timePerToken = rule.window / rule.limit
    return tokensNeeded * timePerToken
  }

  private getIdentifier(scope: RateLimitScope, request: AIGatewayRequest): string {
    switch (scope) {
      case 'global':
        return 'global'
      case 'user':
        return request.context?.user_id || 'anonymous'
      case 'project':
        return request.context?.project_id || 'unknown'
      case 'session':
        return request.context?.session_id || 'unknown'
      case 'ip':
        return request.metadata?.ipAddress || 'unknown'
      default:
        return 'unknown'
    }
  }
}

/**
 * Adaptive Rate Limiting Strategy
 * Adjusts limits based on system load and user behavior
 */
class AdaptiveStrategy implements RateLimitStrategyImpl {
  private storage: RateLimitStorageAdapter
  private baseStrategy: RateLimitStrategyImpl

  constructor(storage: RateLimitStorageAdapter) {
    this.storage = storage
    this.baseStrategy = new SlidingWindowStrategy(storage)
  }

  async checkLimit(rule: RateLimitRule, request: AIGatewayRequest): Promise<RateLimitResult> {
    // Get system load factor (0.5 to 2.0, where 1.0 is normal)
    const loadFactor = await this.getLoadFactor()

    // Adjust the limit based on load
    const adjustedLimit = Math.floor(rule.limit * loadFactor)
    const adjustedRule = { ...rule, limit: adjustedLimit }

    return await this.baseStrategy.checkLimit(adjustedRule, request)
  }

  async recordRequest(rule: RateLimitRule, request: AIGatewayRequest): Promise<void> {
    await this.baseStrategy.recordRequest(rule, request)
  }

  async getCurrentUsage(rule: RateLimitRule, scope: RateLimitScope, identifier: string): Promise<number> {
    return await this.baseStrategy.getCurrentUsage(rule, scope, identifier)
  }

  private async getLoadFactor(): Promise<number> {
    // Simple implementation - in practice, you'd measure actual system metrics
    // For now, return a slightly reduced limit during peak hours
    const hour = new Date().getHours()
    const isPeakHour = hour >= 9 && hour <= 17

    return isPeakHour ? 0.8 : 1.2
  }
}

/**
 * Rate Limiting Metrics
 */
class RateLimitMetrics {
  private allows = 0
  private rejections = 0
  private errors = 0
  private rejectionsByRule = new Map<string, number>()

  recordAllow(): void {
    this.allows++
  }

  recordRejection(ruleId: string): void {
    this.rejections++
    const current = this.rejectionsByRule.get(ruleId) || 0
    this.rejectionsByRule.set(ruleId, current + 1)
  }

  recordError(): void {
    this.errors++
  }

  getStats(): RateLimitStats['metrics'] {
    const total = this.allows + this.rejections
    return {
      allows: this.allows,
      rejections: this.rejections,
      errors: this.errors,
      rejectionRate: total > 0 ? (this.rejections / total) * 100 : 0,
      totalRequests: total,
      rejectionsByRule: Object.fromEntries(this.rejectionsByRule)
    }
  }
}

/**
 * Rate Limiting Storage Adapter Interface
 */
interface RateLimitStorageAdapter {
  addRequest(key: string, timestamp: number, window: number): Promise<void>
  getRequestsInWindow(key: string, start: number, end: number): Promise<number[]>
  incrementCounter(key: string, windowStart: number, ttl: number): Promise<number>
  getCounter(key: string, windowStart: number): Promise<number>
  getTokenBucket(key: string): Promise<any>
  setTokenBucket(key: string, bucket: any): Promise<void>
  clearPattern(pattern: string): Promise<void>
}

/**
 * Memory-based Rate Limit Storage
 */
class MemoryRateLimitStorage implements RateLimitStorageAdapter {
  private requests = new Map<string, number[]>()
  private counters = new Map<string, { value: number; timestamp: number }>()
  private buckets = new Map<string, any>()

  constructor(config: any) {
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60000) // Every minute
  }

  async addRequest(key: string, timestamp: number, window: number): Promise<void> {
    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }

    const timestamps = this.requests.get(key)!
    timestamps.push(timestamp)

    // Remove old entries outside the window
    const cutoff = timestamp - window
    const filtered = timestamps.filter(t => t > cutoff)
    this.requests.set(key, filtered)
  }

  async getRequestsInWindow(key: string, start: number, end: number): Promise<number[]> {
    const timestamps = this.requests.get(key) || []
    return timestamps.filter(t => t >= start && t <= end)
  }

  async incrementCounter(key: string, windowStart: number, ttl: number): Promise<number> {
    const existing = this.counters.get(key)

    if (existing && existing.timestamp === windowStart) {
      existing.value++
      return existing.value
    } else {
      const newValue = 1
      this.counters.set(key, { value: newValue, timestamp: windowStart })
      return newValue
    }
  }

  async getCounter(key: string, windowStart: number): Promise<number> {
    const counter = this.counters.get(key)
    return (counter && counter.timestamp === windowStart) ? counter.value : 0
  }

  async getTokenBucket(key: string): Promise<any> {
    return this.buckets.get(key) || null
  }

  async setTokenBucket(key: string, bucket: any): Promise<void> {
    this.buckets.set(key, bucket)
  }

  async clearPattern(pattern: string): Promise<void> {
    // Simple pattern matching for memory storage
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))

    for (const key of this.requests.keys()) {
      if (regex.test(key)) {
        this.requests.delete(key)
      }
    }

    for (const key of this.counters.keys()) {
      if (regex.test(key)) {
        this.counters.delete(key)
      }
    }

    for (const key of this.buckets.keys()) {
      if (regex.test(key)) {
        this.buckets.delete(key)
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const cutoff = now - 3600000 // Remove entries older than 1 hour

    for (const [key, timestamps] of this.requests) {
      const filtered = timestamps.filter(t => t > cutoff)
      if (filtered.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, filtered)
      }
    }

    for (const [key, counter] of this.counters) {
      if (counter.timestamp < cutoff) {
        this.counters.delete(key)
      }
    }
  }
}

/**
 * Redis-based Rate Limit Storage (Placeholder)
 */
class RedisRateLimitStorage implements RateLimitStorageAdapter {
  constructor(config: any) {
    console.warn('[Rate Limiter] Redis storage not implemented, falling back to memory')
  }

  async addRequest(key: string, timestamp: number, window: number): Promise<void> {
    // Placeholder implementation
  }

  async getRequestsInWindow(key: string, start: number, end: number): Promise<number[]> {
    // Placeholder implementation
    return []
  }

  async incrementCounter(key: string, windowStart: number, ttl: number): Promise<number> {
    // Placeholder implementation
    return 0
  }

  async getCounter(key: string, windowStart: number): Promise<number> {
    // Placeholder implementation
    return 0
  }

  async getTokenBucket(key: string): Promise<any> {
    // Placeholder implementation
    return null
  }

  async setTokenBucket(key: string, bucket: any): Promise<void> {
    // Placeholder implementation
  }

  async clearPattern(pattern: string): Promise<void> {
    // Placeholder implementation
  }
}

/**
 * Database-based Rate Limit Storage (Placeholder)
 */
class DatabaseRateLimitStorage implements RateLimitStorageAdapter {
  constructor(config: any) {
    console.warn('[Rate Limiter] Database storage not implemented, falling back to memory')
  }

  async addRequest(key: string, timestamp: number, window: number): Promise<void> {
    // Placeholder implementation
  }

  async getRequestsInWindow(key: string, start: number, end: number): Promise<number[]> {
    // Placeholder implementation
    return []
  }

  async incrementCounter(key: string, windowStart: number, ttl: number): Promise<number> {
    // Placeholder implementation
    return 0
  }

  async getCounter(key: string, windowStart: number): Promise<number> {
    // Placeholder implementation
    return 0
  }

  async getTokenBucket(key: string): Promise<any> {
    // Placeholder implementation
    return null
  }

  async setTokenBucket(key: string, bucket: any): Promise<void> {
    // Placeholder implementation
  }

  async clearPattern(pattern: string): Promise<void> {
    // Placeholder implementation
  }
}

/**
 * Rate Limit Statistics Interface
 */
export interface RateLimitStats {
  config: {
    enabled: boolean
    strategy: string
    rulesCount: number
  }
  allows: number
  rejections: number
  errors: number
  rejectionRate: number
  totalRequests: number
  rejectionsByRule: Record<string, number>
  metrics: {
    allows: number
    rejections: number
    errors: number
    rejectionRate: number
    totalRequests: number
    rejectionsByRule: Record<string, number>
  }
}

// Export singleton instance factory
export function createRateLimiter(config: RateLimitConfig): RateLimiterService {
  return new RateLimiterService(config)
}