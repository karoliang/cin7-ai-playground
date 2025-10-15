import {
  HealthCheckConfig,
  HealthCheckEndpoint,
  HealthStatus,
  HealthCheckResult,
  AIGatewayConfig
} from '@/types/aiGateway'
import { getGLMService, isGLMServiceInitialized } from './glmService'
import { ResponseCacheService } from './responseCache'
import { RateLimiterService } from './rateLimiter'
import { ContextManagerService } from './contextManager'
import { AIMetricsService } from './aiMetrics'

/**
 * AI Gateway Health Check Service
 * Monitors the health of AI Gateway components and dependencies
 */
export class AIHealthCheckService {
  private config: HealthCheckConfig
  private endpoints: Map<string, HealthCheckEndpoint> = new Map()
  private isRunning = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthStatus: HealthStatus | null = null
  private subscribers: Array<(status: HealthStatus) => void> = []

  // Service dependencies
  private cacheService?: ResponseCacheService
  private rateLimiterService?: RateLimiterService
  private contextManagerService?: ContextManagerService
  private metricsService?: AIMetricsService

  constructor(config: HealthCheckConfig) {
    this.config = config

    // Register default endpoints
    this.registerDefaultEndpoints()

    // Register custom endpoints from config
    config.endpoints.forEach(endpoint => {
      this.registerEndpoint(endpoint)
    })
  }

  /**
   * Set service dependencies
   */
  setServices(services: {
    cache?: ResponseCacheService
    rateLimiter?: RateLimiterService
    contextManager?: ContextManagerService
    metrics?: AIMetricsService
  }): void {
    this.cacheService = services.cache
    this.rateLimiterService = services.rateLimiter
    this.contextManagerService = services.contextManager
    this.metricsService = services.metrics
  }

  /**
   * Start health checking
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    console.log('[Health Check] Starting health monitoring')

    // Run initial health check
    this.runHealthCheck()

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthCheck()
    }, this.config.interval)
  }

  /**
   * Stop health checking
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    console.log('[Health Check] Stopping health monitoring')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Run a comprehensive health check
   */
  async runHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now()
    const checks: HealthCheckResult[] = []

    // Check all registered endpoints
    for (const [id, endpoint] of this.endpoints) {
      const result = await this.checkEndpoint(endpoint)
      checks.push(result)
    }

    // Check internal services
    if (this.cacheService) {
      checks.push(await this.checkCacheService())
    }

    if (this.rateLimiterService) {
      checks.push(await this.checkRateLimiterService())
    }

    if (this.contextManagerService) {
      checks.push(await this.checkContextManagerService())
    }

    if (this.metricsService) {
      checks.push(await this.checkMetricsService())
    }

    // Check GLM service availability
    checks.push(await this.checkGLMService())

    // Determine overall health status
    const overallStatus = this.determineOverallStatus(checks)

    const healthStatus: HealthStatus = {
      status: overallStatus,
      checks,
      timestamp: Date.now()
    }

    this.lastHealthStatus = healthStatus

    // Notify subscribers
    this.notifySubscribers(healthStatus)

    // Record health check metrics
    if (this.metricsService) {
      for (const check of checks) {
        this.metricsService.recordHealthCheck(
          check.endpoint,
          check.status,
          check.responseTime,
          check.error
        )
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Health Check] Health check completed in ${duration}ms, status: ${overallStatus}`)

    return healthStatus
  }

  /**
   * Get current health status
   */
  getCurrentHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus
  }

  /**
   * Get health check summary
   */
  getHealthSummary(): HealthSummary {
    if (!this.lastHealthStatus) {
      return {
        status: 'unknown',
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        lastCheck: null,
        isRunning: this.isRunning
      }
    }

    const { status, checks, timestamp } = this.lastHealthStatus
    const passedChecks = checks.filter(c => c.status === 'pass').length
    const failedChecks = checks.filter(c => c.status === 'fail').length
    const warningChecks = checks.filter(c => c.status === 'warn').length

    return {
      status,
      totalChecks: checks.length,
      passedChecks,
      failedChecks,
      warningChecks,
      lastCheck: timestamp,
      isRunning: this.isRunning
    }
  }

  /**
   * Register health check endpoint
   */
  registerEndpoint(endpoint: HealthCheckEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint)
    console.log(`[Health Check] Registered endpoint: ${endpoint.name}`)
  }

  /**
   * Unregister health check endpoint
   */
  unregisterEndpoint(id: string): void {
    if (this.endpoints.delete(id)) {
      console.log(`[Health Check] Unregistered endpoint: ${id}`)
    }
  }

  /**
   * Subscribe to health status updates
   */
  subscribe(callback: (status: HealthStatus) => void): void {
    this.subscribers.push(callback)
  }

  /**
   * Unsubscribe from health status updates
   */
  unsubscribe(callback: (status: HealthStatus) => void): void {
    const index = this.subscribers.indexOf(callback)
    if (index > -1) {
      this.subscribers.splice(index, 1)
    }
  }

  /**
   * Check specific endpoint
   */
  private async checkEndpoint(endpoint: HealthCheckEndpoint): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout)

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      if (response.status === endpoint.expectedStatus) {
        return {
          endpoint: endpoint.name,
          status: 'pass',
          responseTime,
          timestamp: Date.now()
        }
      } else {
        return {
          endpoint: endpoint.name,
          status: 'fail',
          responseTime,
          error: `Expected status ${endpoint.expectedStatus}, got ${response.status}`,
          timestamp: Date.now()
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: endpoint.name,
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check cache service health
   */
  private async checkCacheService(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!this.cacheService) {
        throw new Error('Cache service not available')
      }

      // Perform a simple cache operation
      const stats = this.cacheService.getStats()
      const responseTime = Date.now() - startTime

      return {
        endpoint: 'cache-service',
        status: 'pass',
        responseTime,
        timestamp: Date.now(),
        metadata: {
          hits: stats.metrics.hits,
          misses: stats.metrics.misses,
          hitRate: stats.metrics.hitRate
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: 'cache-service',
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check rate limiter service health
   */
  private async checkRateLimiterService(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!this.rateLimiterService) {
        throw new Error('Rate limiter service not available')
      }

      // Get rate limiter stats
      const stats = this.rateLimiterService.getStats()
      const responseTime = Date.now() - startTime

      return {
        endpoint: 'rate-limiter-service',
        status: 'pass',
        responseTime,
        timestamp: Date.now(),
        metadata: {
          allows: stats.metrics.allows,
          rejections: stats.metrics.rejections,
          rejectionRate: stats.metrics.rejectionRate
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: 'rate-limiter-service',
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check context manager service health
   */
  private async checkContextManagerService(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!this.contextManagerService) {
        throw new Error('Context manager service not available')
      }

      // Get context manager stats
      const stats = this.contextManagerService.getStats()
      const responseTime = Date.now() - startTime

      return {
        endpoint: 'context-manager-service',
        status: 'pass',
        responseTime,
        timestamp: Date.now(),
        metadata: {
          currentConversations: stats.currentConversations,
          currentProjects: stats.currentProjects,
          conversationsCreated: stats.conversationsCreated
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: 'context-manager-service',
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check metrics service health
   */
  private async checkMetricsService(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!this.metricsService) {
        throw new Error('Metrics service not available')
      }

      // Get metrics
      const metrics = this.metricsService.getMetrics()
      const responseTime = Date.now() - startTime

      return {
        endpoint: 'metrics-service',
        status: 'pass',
        responseTime,
        timestamp: Date.now(),
        metadata: {
          totalRequests: metrics.requests.total,
          errorRate: metrics.requests.errorRate,
          averageResponseTime: metrics.performance.averageResponseTime
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: 'metrics-service',
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check GLM service health
   */
  private async checkGLMService(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      if (!isGLMServiceInitialized()) {
        return {
          endpoint: 'glm-service',
          status: 'warn',
          responseTime: Date.now() - startTime,
          error: 'GLM service not initialized',
          timestamp: Date.now()
        }
      }

      const glmService = getGLMService()
      const isHealthy = await glmService.testConnection()
      const responseTime = Date.now() - startTime

      if (isHealthy) {
        return {
          endpoint: 'glm-service',
          status: 'pass',
          responseTime,
          timestamp: Date.now()
        }
      } else {
        return {
          endpoint: 'glm-service',
          status: 'fail',
          responseTime,
          error: 'GLM service connection test failed',
          timestamp: Date.now()
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: 'glm-service',
        status: 'fail',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (checks.length === 0) {
      return 'unhealthy'
    }

    const failedChecks = checks.filter(c => c.status === 'fail')
    const warningChecks = checks.filter(c => c.status === 'warn')
    const passedChecks = checks.filter(c => c.status === 'pass')

    // If any critical checks fail, overall status is unhealthy
    const criticalFailures = failedChecks.filter(check =>
      this.isCriticalEndpoint(check.endpoint)
    )

    if (criticalFailures.length > 0) {
      return 'unhealthy'
    }

    // If any checks fail, status is degraded
    if (failedChecks.length > 0) {
      return 'degraded'
    }

    // If any warnings, status is degraded
    if (warningChecks.length > 0) {
      return 'degraded'
    }

    // All checks passed
    return 'healthy'
  }

  /**
   * Check if endpoint is critical
   */
  private isCriticalEndpoint(endpointName: string): boolean {
    const criticalEndpoints = [
      'glm-service',
      'cache-service',
      'rate-limiter-service',
      'context-manager-service'
    ]

    return criticalEndpoints.includes(endpointName)
  }

  /**
   * Register default health check endpoints
   */
  private registerDefaultEndpoints(): void {
    // Default AI Gateway health check endpoint
    this.registerEndpoint({
      id: 'ai-gateway-self',
      name: 'AI Gateway Self Check',
      url: '/health',
      method: 'GET',
      headers: {},
      expectedStatus: 200,
      timeout: 5000,
      interval: 30000
    })

    // GLM API health check (if configured)
    if (import.meta.env.VITE_GLM_API_KEY) {
      this.registerEndpoint({
        id: 'glm-api',
        name: 'GLM API',
        url: 'https://open.bigmodel.cn/api/paas/v4/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GLM_API_KEY}`
        },
        expectedStatus: 200,
        timeout: 10000,
        interval: 60000
      })
    }

    // Supabase health check (if configured)
    if (import.meta.env.VITE_SUPABASE_URL) {
      this.registerEndpoint({
        id: 'supabase',
        name: 'Supabase',
        url: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        expectedStatus: 200,
        timeout: 5000,
        interval: 30000
      })
    }
  }

  /**
   * Notify subscribers of health status changes
   */
  private notifySubscribers(status: HealthStatus): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(status)
      } catch (error) {
        console.error('[Health Check] Error notifying subscriber:', error)
      }
    }
  }
}

/**
 * Health Check Result Extension
 */
interface ExtendedHealthCheckResult extends HealthCheckResult {
  metadata?: Record<string, any>
}

/**
 * Health Summary
 */
export interface HealthSummary {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  totalChecks: number
  passedChecks: number
  failedChecks: number
  warningChecks: number
  lastCheck: number | null
  isRunning: boolean
}

/**
 * Health Check Utilities
 */
export class HealthCheckUtils {
  /**
   * Create health check response for HTTP endpoints
   */
  static createHealthResponse(status: HealthStatus): Response {
    const responseBody = {
      status: status.status,
      timestamp: status.timestamp,
      checks: status.checks.map(check => ({
        endpoint: check.endpoint,
        status: check.status,
        responseTime: check.responseTime,
        error: check.error
      })),
      uptime: process.uptime ? process.uptime() : 0
    }

    const httpStatus = status.status === 'healthy' ? 200 :
                      status.status === 'degraded' ? 200 : 503

    return new Response(JSON.stringify(responseBody, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
  }

  /**
   * Check if health status is healthy
   */
  static isHealthy(status: HealthStatus | null): boolean {
    return status?.status === 'healthy'
  }

  /**
   * Check if health status is degraded or unhealthy
   */
  static hasIssues(status: HealthStatus | null): boolean {
    return status?.status !== 'healthy'
  }

  /**
   * Get failed health checks
   */
  static getFailedChecks(status: HealthStatus | null): HealthCheckResult[] {
    return status?.checks.filter(check => check.status === 'fail') || []
  }

  /**
   * Get warning health checks
   */
  static getWarningChecks(status: HealthStatus | null): HealthCheckResult[] {
    return status?.checks.filter(check => check.status === 'warn') || []
  }

  /**
   * Format health check duration
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`
    } else {
      return `${(ms / 60000).toFixed(2)}m`
    }
  }
}

// Export factory function
export function createAIHealthCheckService(config: HealthCheckConfig): AIHealthCheckService {
  return new AIHealthCheckService(config)
}