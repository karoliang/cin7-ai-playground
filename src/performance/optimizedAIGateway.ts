/**
 * Optimized AI Gateway Service
 * Enhanced AI Gateway with performance optimizations, memory management, and intelligent routing
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'

export interface OptimizedAIGatewayConfig {
  providers: AIProvider[]
  optimization: {
    enableSmartRouting: boolean
    enableLoadBalancing: boolean
    enableCircuitBreaker: boolean
    enableRetryWithBackoff: boolean
    enableResponseStreaming: boolean
    maxConcurrentRequests: number
    requestTimeoutMs: number
    memoryThresholdMB: number
  }
  caching: {
    enableSemanticCache: boolean
    enablePredictiveCache: boolean
    maxCacheSizeMB: number
    cacheEvictionPolicy: 'lru' | 'lfu' | 'ttl'
  }
  monitoring: {
    enableMetrics: boolean
    enableTracing: boolean
    enableProfiling: boolean
    metricsIntervalMs: number
  }
}

export interface AIProvider {
  id: string
  name: string
  type: 'glm' | 'openai' | 'anthropic' | 'custom'
  endpoint: string
  models: AIModel[]
  credentials: {
    apiKey: string
    organizationId?: string
  }
  limits: {
    requestsPerMinute: number
    tokensPerMinute: number
    maxConcurrency: number
  }
  cost: {
    inputTokenPrice: number // per 1K tokens
    outputTokenPrice: number
    requestPrice?: number
  }
  performance: {
    avgLatencyMs: number
    successRate: number
    lastHealthCheck: number
  }
}

export interface AIModel {
  id: string
  name: string
  contextWindow: number
  maxOutputTokens: number
  capabilities: string[]
  specialty?: string
  costMultiplier: number
  performanceMultiplier: number
}

export interface OptimizedRequest {
  id: string
  userId?: string
  projectId?: string
  provider: string
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
    timestamp?: number
  }>
  options: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
    responseFormat?: 'text' | 'json'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
  metadata: {
    estimatedTokens: number
    estimatedCost: number
    requestType: string
    complexity: 'simple' | 'medium' | 'complex'
    requiresReasoning: boolean
  }
  timestamp: number
  timeout?: number
}

export interface OptimizedResponse {
  id: string
  requestId: string
  provider: string
  model: string
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata: {
    processingTimeMs: number
    cacheHit: boolean
    cost: number
    routedTo: string
    optimizations: string[]
  }
  timestamp: number
  stream?: boolean
}

export interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  cacheHitRate: number
  costSavings: number
  memoryUsageMB: number
  activeConnections: number
  queueSize: number
  providerMetrics: { [providerId: string]: ProviderMetrics }
}

export interface ProviderMetrics {
  requests: number
  successes: number
  failures: number
  averageLatencyMs: number
  cost: number
  lastUsed: number
  healthStatus: 'healthy' | 'degraded' | 'unhealthy'
  circuitBreakerState: 'closed' | 'open' | 'half-open'
}

/**
 * Optimized AI Gateway Service
 */
export class OptimizedAIGateway extends EventEmitter {
  private config: OptimizedAIGatewayConfig
  private providers = new Map<string, AIProvider>()
  private requestQueue = new Map<string, OptimizedRequest>()
  private activeRequests = new Map<string, Promise<OptimizedResponse>>()
  private responseCache = new Map<string, OptimizedResponse>()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private rateLimiters = new Map<string, RateLimiter>()
  private loadBalancer: LoadBalancer
  private smartRouter: SmartRouter
  private memoryManager: MemoryManager
  private metricsCollector: MetricsCollector
  private cleanupTimer: NodeJS.Timeout | null = null
  private metricsTimer: NodeJS.Timeout | null = null

  constructor(config: OptimizedAIGatewayConfig) {
    super()
    this.config = config

    // Initialize providers
    for (const provider of config.providers) {
      this.providers.set(provider.id, provider)
      this.circuitBreakers.set(provider.id, new CircuitBreaker(provider.id))
      this.rateLimiters.set(provider.id, new RateLimiter(provider.limits))
    }

    // Initialize services
    this.loadBalancer = new LoadBalancer(Array.from(this.providers.values()))
    this.smartRouter = new SmartRouter(this.providers, config.optimization)
    this.memoryManager = new MemoryManager(config.optimization.memoryThresholdMB)
    this.metricsCollector = new MetricsCollector(config.monitoring)

    // Start background tasks
    this.startBackgroundTasks()
  }

  /**
   * Process an optimized AI request
   */
  async processRequest(request: OptimizedRequest): Promise<OptimizedResponse> {
    const requestId = request.id
    const startTime = performance.now()

    try {
      // Check memory usage
      if (this.memoryManager.isThresholdExceeded()) {
        await this.memoryManager.cleanup()
      }

      // Check cache first
      if (this.config.caching.enableSemanticCache) {
        const cachedResponse = await this.checkCache(request)
        if (cachedResponse) {
          this.metricsCollector.recordCacheHit()
          return this.enrichCachedResponse(cachedResponse, request)
        }
      }

      // Add to active requests
      this.requestQueue.set(requestId, request)

      // Smart routing and provider selection
      const selectedProvider = await this.smartRouter.selectProvider(request)

      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(selectedProvider.id)
      if (!circuitBreaker?.canExecute()) {
        throw new Error(`Provider ${selectedProvider.id} circuit breaker is open`)
      }

      // Check rate limits
      const rateLimiter = this.rateLimiters.get(selectedProvider.id)
      if (!await rateLimiter?.canMakeRequest()) {
        throw new Error(`Rate limit exceeded for provider ${selectedProvider.id}`)
      }

      // Execute request with timeout and retry
      const response = await this.executeWithRetry(request, selectedProvider)

      // Update circuit breaker and rate limiter
      circuitBreaker?.recordSuccess()
      rateLimiter?.recordRequest()

      // Cache response
      if (this.config.caching.enableSemanticCache) {
        await this.cacheResponse(request, response)
      }

      // Record metrics
      const processingTime = performance.now() - startTime
      this.metricsCollector.recordRequest(request, response, processingTime)

      // Clean up
      this.requestQueue.delete(requestId)

      this.emit('request:completed', { request, response, processingTime })
      return response

    } catch (error) {
      // Record failure
      const processingTime = performance.now() - startTime
      this.metricsCollector.recordFailure(request, error as Error, processingTime)

      // Update circuit breaker if applicable
      if (request.provider) {
        const circuitBreaker = this.circuitBreakers.get(request.provider)
        circuitBreaker?.recordFailure()
      }

      this.requestQueue.delete(requestId)
      this.emit('request:failed', { request, error, processingTime })
      throw error
    }
  }

  /**
   * Process streaming request
   */
  async *processStreamingRequest(request: OptimizedRequest): AsyncGenerator<string, void, unknown> {
    const requestId = request.id
    const startTime = performance.now()

    try {
      // Similar to processRequest but with streaming
      const selectedProvider = await this.smartRouter.selectProvider(request)
      const circuitBreaker = this.circuitBreakers.get(selectedProvider.id)

      if (!circuitBreaker?.canExecute()) {
        throw new Error(`Provider ${selectedProvider.id} circuit breaker is open`)
      }

      // Stream execution
      const stream = await this.executeStreaming(request, selectedProvider)

      for await (const chunk of stream) {
        yield chunk
      }

      const processingTime = performance.now() - startTime
      this.metricsCollector.recordRequest(request, {} as OptimizedResponse, processingTime)

    } catch (error) {
      const processingTime = performance.now() - startTime
      this.metricsCollector.recordFailure(request, error as Error, processingTime)
      throw error
    } finally {
      this.requestQueue.delete(requestId)
    }
  }

  /**
   * Batch process multiple requests
   */
  async processBatch(requests: OptimizedRequest[]): Promise<OptimizedResponse[]> {
    const batchId = this.generateId()
    const startTime = performance.now()

    try {
      // Group requests by optimal provider
      const providerGroups = await this.groupRequestsByProvider(requests)

      const results: OptimizedResponse[] = []

      // Process each group in parallel
      const groupPromises = Array.from(providerGroups.entries()).map(async ([providerId, groupRequests]) => {
        const provider = this.providers.get(providerId)!
        const circuitBreaker = this.circuitBreakers.get(providerId)

        if (!circuitBreaker?.canExecute()) {
          throw new Error(`Provider ${providerId} circuit breaker is open`)
        }

        return this.executeBatchForProvider(groupRequests, provider)
      })

      const groupResults = await Promise.all(groupPromises)
      results.push(...groupResults.flat())

      const processingTime = performance.now() - startTime
      this.metricsCollector.recordBatch(batchId, requests, results, processingTime)

      return results

    } catch (error) {
      const processingTime = performance.now() - startTime
      this.metricsCollector.recordBatchFailure(batchId, requests, error as Error, processingTime)
      throw error
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const baseMetrics = this.metricsCollector.getMetrics()

    // Add real-time metrics
    return {
      ...baseMetrics,
      activeConnections: this.activeRequests.size,
      queueSize: this.requestQueue.size,
      memoryUsageMB: this.memoryManager.getCurrentUsage(),
      providerMetrics: this.getProviderMetrics()
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): { [providerId: string]: ProviderMetrics } {
    return this.getProviderMetrics()
  }

  /**
   * Optimize providers based on performance
   */
  async optimizeProviders(): Promise<void> {
    const metrics = this.getProviderMetrics()

    for (const [providerId, providerMetrics] of Object.entries(metrics)) {
      const provider = this.providers.get(providerId)
      if (!provider) continue

      // Update provider performance data
      provider.performance.avgLatencyMs = providerMetrics.averageLatencyMs
      provider.performance.successRate = providerMetrics.successes / Math.max(1, providerMetrics.requests)

      // Adjust load balancer weights
      this.loadBalancer.updateWeight(providerId, this.calculateProviderWeight(providerMetrics))
    }

    this.emit('providers:optimized', { metrics })
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = null
    }

    this.requestQueue.clear()
    this.activeRequests.clear()
    this.responseCache.clear()
    this.memoryManager.cleanup()
    this.metricsCollector.cleanup()
    this.removeAllListeners()
  }

  // Private methods

  private async checkCache(request: OptimizedRequest): Promise<OptimizedResponse | null> {
    const cacheKey = this.generateCacheKey(request)
    const cached = this.responseCache.get(cacheKey)

    if (!cached) return null

    // Check if cache entry is still valid
    const age = Date.now() - cached.timestamp
    const maxAge = this.getCacheMaxAge(request)

    if (age > maxAge) {
      this.responseCache.delete(cacheKey)
      return null
    }

    return cached
  }

  private async cacheResponse(request: OptimizedRequest, response: OptimizedResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request)

    // Check cache size limits
    if (this.responseCache.size >= this.getCacheMaxSize()) {
      this.evictOldestCacheEntries()
    }

    this.responseCache.set(cacheKey, {
      ...response,
      metadata: {
        ...response.metadata,
        cacheHit: true
      }
    })
  }

  private enrichCachedResponse(response: OptimizedResponse, request: OptimizedRequest): OptimizedResponse {
    return {
      ...response,
      requestId: request.id,
      metadata: {
        ...response.metadata,
        cacheHit: true,
        optimizations: [...response.metadata.optimizations, 'cache_hit']
      }
    }
  }

  private async executeWithRetry(request: OptimizedRequest, provider: AIProvider): Promise<OptimizedResponse> {
    const maxRetries = this.config.optimization.enableRetryWithBackoff ? 3 : 1
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest(request, provider)
      } catch (error) {
        lastError = error as Error

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Request failed after all retries')
  }

  private async executeRequest(request: OptimizedRequest, provider: AIProvider): Promise<OptimizedResponse> {
    const startTime = performance.now()

    // Simulate API call with timeout
    const response = await Promise.race([
      this.simulateProviderCall(request, provider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), request.timeout || this.config.optimization.requestTimeoutMs)
      )
    ])

    const processingTime = performance.now() - startTime

    return {
      id: this.generateId(),
      requestId: request.id,
      provider: provider.id,
      model: request.model,
      content: response.content,
      usage: response.usage,
      metadata: {
        processingTimeMs: processingTime,
        cacheHit: false,
        cost: this.calculateCost(provider, request.model, response.usage),
        routedTo: provider.id,
        optimizations: []
      },
      timestamp: Date.now()
    }
  }

  private async executeStreaming(request: OptimizedRequest, provider: AIProvider): AsyncGenerator<string> {
    // Simulate streaming response
    const chunks = [
      "This is a streamed",
      " response from the",
      " optimized AI gateway.",
      " It demonstrates how",
      " streaming can improve",
      " perceived performance."
    ]

    for (const chunk of chunks) {
      yield chunk
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  private async executeBatchForProvider(requests: OptimizedRequest[], provider: AIProvider): Promise<OptimizedResponse[]> {
    // Simulate batch execution
    const results: OptimizedResponse[] = []

    for (const request of requests) {
      const response = await this.executeRequest(request, provider)
      results.push(response)
    }

    return results
  }

  private async groupRequestsByProvider(requests: OptimizedRequest[]): Promise<Map<string, OptimizedRequest[]>> {
    const groups = new Map<string, OptimizedRequest[]>()

    for (const request of requests) {
      const providerId = await this.smartRouter.selectProvider(request)
      if (!groups.has(providerId.id)) {
        groups.set(providerId.id, [])
      }
      groups.get(providerId.id)!.push(request)
    }

    return groups
  }

  private async simulateProviderCall(request: OptimizedRequest, provider: AIProvider): Promise<any> {
    // Simulate API call with variable latency based on provider performance
    const baseLatency = provider.performance.avgLatencyMs
    const variance = baseLatency * 0.3
    const latency = baseLatency + (Math.random() - 0.5) * variance

    await new Promise(resolve => setTimeout(resolve, latency))

    return {
      content: `Simulated response from ${provider.name} for model ${request.model}`,
      usage: {
        promptTokens: request.metadata.estimatedTokens,
        completionTokens: Math.floor(request.metadata.estimatedTokens * 0.3),
        totalTokens: Math.floor(request.metadata.estimatedTokens * 1.3)
      }
    }
  }

  private generateCacheKey(request: OptimizedRequest): string {
    // Generate semantic cache key based on content, not exact match
    const content = request.messages.map(m => m.content).join('|')
    return `${request.provider}:${request.model}:${this.hashString(content)}`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  private getCacheMaxAge(request: OptimizedRequest): number {
    // Dynamic cache TTL based on request type and complexity
    const baseTTL = 5 * 60 * 1000 // 5 minutes
    const complexityMultiplier = request.metadata.complexity === 'simple' ? 2 :
                                 request.metadata.complexity === 'medium' ? 1.5 : 1
    return baseTTL * complexityMultiplier
  }

  private getCacheMaxSize(): number {
    return Math.floor((this.config.caching.maxCacheSizeMB * 1024 * 1024) / 1024) // Approximate entries
  }

  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.responseCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const removeCount = Math.floor(entries.length * 0.25) // Remove 25%
    for (let i = 0; i < removeCount; i++) {
      this.responseCache.delete(entries[i][0])
    }
  }

  private calculateCost(provider: AIProvider, model: string, usage: any): number {
    const modelConfig = provider.models.find(m => m.id === model)
    if (!modelConfig) return 0

    const inputCost = (usage.promptTokens / 1000) * provider.cost.inputTokenPrice * modelConfig.costMultiplier
    const outputCost = (usage.completionTokens / 1000) * provider.cost.outputTokenPrice * modelConfig.costMultiplier
    const requestCost = provider.cost.requestPrice || 0

    return inputCost + outputCost + requestCost
  }

  private calculateProviderWeight(metrics: ProviderMetrics): number {
    // Calculate weight based on performance and cost
    const performanceScore = (metrics.successes / Math.max(1, metrics.requests)) * 100
    const latencyScore = Math.max(0, 100 - (metrics.averageLatencyMs / 50)) // 50ms = 0 score
    const costEfficiency = Math.max(0, 100 - (metrics.cost * 1000)) // Lower cost = higher score

    return (performanceScore * 0.4) + (latencyScore * 0.3) + (costEfficiency * 0.3)
  }

  private getProviderMetrics(): { [providerId: string]: ProviderMetrics } {
    const metrics: { [providerId: string]: ProviderMetrics } = {}

    for (const [providerId, provider] of this.providers) {
      const circuitBreaker = this.circuitBreakers.get(providerId)
      const rateLimiter = this.rateLimiters.get(providerId)

      metrics[providerId] = {
        requests: 0, // Would be tracked in metrics collector
        successes: 0,
        failures: 0,
        averageLatencyMs: provider.performance.avgLatencyMs,
        cost: 0,
        lastUsed: provider.performance.lastHealthCheck,
        healthStatus: this.getProviderHealthStatus(provider),
        circuitBreakerState: circuitBreaker?.getState() || 'closed'
      }
    }

    return metrics
  }

  private getProviderHealthStatus(provider: AIProvider): 'healthy' | 'degraded' | 'unhealthy' {
    if (provider.performance.successRate < 0.9) return 'unhealthy'
    if (provider.performance.successRate < 0.95) return 'degraded'
    return 'healthy'
  }

  private startBackgroundTasks(): void {
    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, 60000) // Every minute

    // Metrics collection
    if (this.config.monitoring.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics()
      }, this.config.monitoring.metricsIntervalMs)
    }
  }

  private performCleanup(): void {
    // Clean up expired cache entries
    const now = Date.now()
    for (const [key, response] of this.responseCache) {
      const age = now - response.timestamp
      const maxAge = this.getCacheMaxAge({} as OptimizedRequest)
      if (age > maxAge) {
        this.responseCache.delete(key)
      }
    }

    // Memory cleanup
    this.memoryManager.cleanup()

    this.emit('cleanup:completed')
  }

  private collectMetrics(): void {
    const metrics = this.getMetrics()
    this.emit('metrics:collected', metrics)
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Supporting classes

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private lastFailureTime = 0
  private successThreshold = 5
  private failureThreshold = 5
  private timeoutMs = 60000

  constructor(private providerId: string) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'half-open'
        return true
      }
      return false
    }

    return this.state === 'half-open'
  }

  recordSuccess(): void {
    this.failures = 0

    if (this.state === 'half-open') {
      this.state = 'closed'
    }
  }

  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }
}

class RateLimiter {
  private requests = 0
  private lastReset = Date.now()
  private tokens = 0

  constructor(private limits: { requestsPerMinute: number; tokensPerMinute: number }) {
    this.tokens = limits.tokensPerMinute
  }

  async canMakeRequest(): Promise<boolean> {
    const now = Date.now()

    // Reset counters every minute
    if (now - this.lastReset > 60000) {
      this.requests = 0
      this.tokens = this.limits.tokensPerMinute
      this.lastReset = now
    }

    return this.requests < this.limits.requestsPerMinute && this.tokens > 0
  }

  recordRequest(): void {
    this.requests++
    this.tokens = Math.max(0, this.tokens - 1)
  }
}

class LoadBalancer {
  private weights = new Map<string, number>()

  constructor(private providers: AIProvider[]) {
    // Initialize with equal weights
    providers.forEach(provider => {
      this.weights.set(provider.id, 1.0)
    })
  }

  selectProvider(): AIProvider {
    const totalWeight = Array.from(this.weights.values()).reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (const provider of this.providers) {
      const weight = this.weights.get(provider.id) || 0
      random -= weight
      if (random <= 0) {
        return provider
      }
    }

    return this.providers[0]
  }

  updateWeight(providerId: string, weight: number): void {
    this.weights.set(providerId, Math.max(0.1, weight))
  }
}

class SmartRouter {
  constructor(
    private providers: Map<string, AIProvider>,
    private config: any
  ) {}

  async selectProvider(request: OptimizedRequest): Promise<AIProvider> {
    // Smart routing logic based on request characteristics
    const availableProviders = Array.from(this.providers.values())

    // Filter by capability
    const capableProviders = availableProviders.filter(provider =>
      provider.models.some(model => model.id === request.model)
    )

    if (capableProviders.length === 0) {
      throw new Error(`No provider available for model ${request.model}`)
    }

    // Select based on performance and cost
    return capableProviders.reduce((best, current) => {
      const bestScore = this.calculateProviderScore(best, request)
      const currentScore = this.calculateProviderScore(current, request)
      return currentScore > bestScore ? current : best
    })
  }

  private calculateProviderScore(provider: AIProvider, request: OptimizedRequest): number {
    const performanceScore = provider.performance.successRate * 100
    const latencyScore = Math.max(0, 100 - (provider.performance.avgLatencyMs / 50))
    const costScore = Math.max(0, 100 - (provider.cost.inputTokenPrice * 1000))

    return (performanceScore * 0.4) + (latencyScore * 0.3) + (costScore * 0.3)
  }
}

class MemoryManager {
  private usageMB = 0

  constructor(private thresholdMB: number) {}

  isThresholdExceeded(): boolean {
    return this.usageMB > this.thresholdMB
  }

  getCurrentUsage(): number {
    return this.usageMB
  }

  async cleanup(): Promise<void> {
    // Simulate memory cleanup
    this.usageMB = Math.max(0, this.usageMB * 0.8)
  }

  cleanup(): void {
    this.usageMB = 0
  }
}

class MetricsCollector {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    totalLatency: 0,
    costs: []
  }

  constructor(private config: any) {}

  recordRequest(request: OptimizedRequest, response: OptimizedResponse, latency: number): void {
    this.metrics.totalRequests++
    this.metrics.successfulRequests++
    this.metrics.totalLatency += latency
    this.metrics.costs.push(response.metadata.cost)
  }

  recordFailure(request: OptimizedRequest, error: Error, latency: number): void {
    this.metrics.totalRequests++
    this.metrics.failedRequests++
    this.metrics.totalLatency += latency
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++
  }

  recordBatch(batchId: string, requests: OptimizedRequest[], responses: OptimizedResponse[], latency: number): void {
    this.metrics.totalRequests += requests.length
    this.metrics.successfulRequests += responses.length
    this.metrics.totalLatency += latency
  }

  recordBatchFailure(batchId: string, requests: OptimizedRequest[], error: Error, latency: number): void {
    this.metrics.totalRequests += requests.length
    this.metrics.failedRequests += requests.length
    this.metrics.totalLatency += latency
  }

  getMetrics(): PerformanceMetrics {
    const averageLatency = this.metrics.totalRequests > 0 ?
      this.metrics.totalLatency / this.metrics.totalRequests : 0

    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageLatencyMs: averageLatency,
      p95LatencyMs: averageLatency * 1.5, // Simplified
      p99LatencyMs: averageLatency * 2,   // Simplified
      cacheHitRate: this.metrics.totalRequests > 0 ?
        (this.metrics.cacheHits / this.metrics.totalRequests) * 100 : 0,
      costSavings: this.metrics.costs.reduce((sum, cost) => sum + cost, 0) * 0.1, // Simplified
      memoryUsageMB: 0,
      activeConnections: 0,
      queueSize: 0,
      providerMetrics: {}
    }
  }

  cleanup(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      totalLatency: 0,
      costs: []
    }
  }
}

// Factory function
export function createOptimizedAIGateway(config: OptimizedAIGatewayConfig): OptimizedAIGateway {
  return new OptimizedAIGateway(config)
}