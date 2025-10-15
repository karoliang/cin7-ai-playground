import {
  MonitoringConfig,
  LogLevel,
  LogFormat,
  AIGatewayRequest,
  AIGatewayResponse,
  AIGatewayError,
  AIGatewayAnalytics
} from '@/types/aiGateway'

/**
 * AI Gateway Metrics and Monitoring Service
 * Provides comprehensive monitoring, logging, and analytics
 */
export class AIMetricsService {
  private config: MonitoringConfig
  private logger: Logger
  private metricsCollector: MetricsCollector
  private analytics: AnalyticsService
  private alertManager: AlertManager

  constructor(config: MonitoringConfig) {
    this.config = config
    this.logger = new Logger(config.logging)
    this.metricsCollector = new MetricsCollector(config.metrics)
    this.analytics = new AnalyticsService()
    this.alertManager = new AlertManager(config.alerts)

    // Start metrics collection if enabled
    if (config.metrics.enabled) {
      this.startMetricsCollection()
    }

    // Start alert monitoring if enabled
    if (config.alerts.enabled) {
      this.startAlertMonitoring()
    }
  }

  /**
   * Record request start
   */
  recordRequestStart(request: AIGatewayRequest): RequestMetrics {
    const metrics: RequestMetrics = {
      requestId: request.id,
      timestamp: Date.now(),
      provider: request.provider,
      model: request.model,
      userId: request.context?.userId,
      projectId: request.context?.projectId,
      sessionId: request.context?.sessionId
    }

    this.logger.info('Request started', {
      requestId: request.id,
      provider: request.provider,
      model: request.model,
      userId: request.context?.userId
    })

    return metrics
  }

  /**
   * Record request completion
   */
  recordRequestComplete(
    requestMetrics: RequestMetrics,
    response: AIGatewayResponse,
    cached: boolean = false
  ): void {
    const duration = Date.now() - requestMetrics.timestamp

    const completionMetrics: CompletionMetrics = {
      ...requestMetrics,
      duration,
      success: true,
      cached,
      usage: response.usage,
      cost: response.metadata.cost,
      finishReason: response.finishReason
    }

    this.metricsCollector.recordCompletion(completionMetrics)
    this.analytics.recordCompletion(completionMetrics)

    this.logger.info('Request completed', {
      requestId: requestMetrics.requestId,
      duration,
      cached,
      tokens: response.usage.totalTokens,
      cost: response.metadata.cost
    })

    // Check for alerts
    this.alertManager.checkMetrics(completionMetrics)
  }

  /**
   * Record request error
   */
  recordRequestError(requestMetrics: RequestMetrics, error: AIGatewayError): void {
    const duration = Date.now() - requestMetrics.timestamp

    const errorMetrics: ErrorMetrics = {
      ...requestMetrics,
      duration,
      success: false,
      error: {
        code: error.code,
        message: error.message,
        provider: error.provider
      }
    }

    this.metricsCollector.recordError(errorMetrics)
    this.analytics.recordError(errorMetrics)

    this.logger.error('Request failed', {
      requestId: requestMetrics.requestId,
      error: error.code,
      message: error.message,
      provider: error.provider,
      duration
    })

    // Check for alerts
    this.alertManager.checkError(errorMetrics)
  }

  /**
   * Record streaming chunk
   */
  recordStreamChunk(requestId: string, chunkIndex: number, size: number): void {
    this.metricsCollector.recordStreamChunk(requestId, chunkIndex, size)

    if (chunkIndex % 10 === 0) { // Log every 10th chunk to avoid spam
      this.logger.debug('Stream chunk', {
        requestId,
        chunkIndex,
        size
      })
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(requestId: string, response: AIGatewayResponse): void {
    this.metricsCollector.recordCacheHit(requestId)
    this.analytics.recordCacheHit(response)

    this.logger.debug('Cache hit', {
      requestId,
      tokens: response.usage.totalTokens
    })
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(
    userId: string,
    ruleId: string,
    limit: number,
    remaining: number,
    resetTime: number
  ): void {
    this.metricsCollector.recordRateLimitHit(userId, ruleId)

    this.logger.warn('Rate limit exceeded', {
      userId,
      ruleId,
      limit,
      remaining,
      resetTime
    })

    this.alertManager.checkRateLimit(userId, ruleId)
  }

  /**
   * Record health check
   */
  recordHealthCheck(
    endpoint: string,
    status: 'pass' | 'fail' | 'warn',
    responseTime: number,
    error?: string
  ): void {
    this.metricsCollector.recordHealthCheck(endpoint, status, responseTime)
    this.analytics.recordHealthCheck(endpoint, status, responseTime)

    const level = status === 'fail' ? 'error' : status === 'warn' ? 'warn' : 'info'
    this.logger[level]('Health check', {
      endpoint,
      status,
      responseTime,
      error
    })

    this.alertManager.checkHealthCheck(endpoint, status, responseTime)
  }

  /**
   * Get current metrics
   */
  getMetrics(): GatewayMetrics {
    return this.metricsCollector.getMetrics()
  }

  /**
   * Get analytics data
   */
  getAnalytics(timeRange?: TimeRange): AIGatewayAnalytics {
    return this.analytics.getAnalytics(timeRange)
  }

  /**
   * Get logs
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    return this.logger.getLogs(filter)
  }

  /**
   * Get alerts
   */
  getAlerts(status?: AlertStatus): Alert[] {
    return this.alertManager.getAlerts(status)
  }

  /**
   * Create custom alert
   */
  createAlert(rule: AlertRule): void {
    this.alertManager.addRule(rule)
  }

  /**
   * Export metrics
   */
  async exportMetrics(format: 'prometheus' | 'json' | 'csv'): Promise<string> {
    switch (format) {
      case 'prometheus':
        return this.metricsCollector.exportPrometheus()
      case 'json':
        return JSON.stringify(this.getMetrics(), null, 2)
      case 'csv':
        return this.metricsCollector.exportCSV()
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.metricsCollector.rotateMetrics()
    }, this.config.metrics.interval)
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    setInterval(() => {
      this.alertManager.checkAlerts()
    }, 60000) // Check alerts every minute
  }

  /**
   * Cleanup old data
   */
  cleanup(): void {
    const cutoff = Date.now() - this.config.metrics.retention
    this.logger.cleanup(cutoff)
    this.metricsCollector.cleanup(cutoff)
    this.analytics.cleanup(cutoff)
  }
}

/**
 * Logger Service
 */
class Logger {
  private config: MonitoringConfig['logging']
  private logs: LogEntry[] = []
  private maxLogSize = 10000

  constructor(config: MonitoringConfig['logging']) {
    this.config = config
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: any): void {
    this.log('error', message, data)
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      service: 'ai-gateway'
    }

    this.logs.push(logEntry)

    // Keep logs under max size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize)
    }

    // Output to configured outputs
    this.outputLog(logEntry)
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }

  private outputLog(logEntry: LogEntry): void {
    for (const output of this.config.outputs) {
      try {
        switch (output.type) {
          case 'console':
            this.outputToConsole(logEntry)
            break
          case 'file':
            // File output would be implemented here
            break
          case 'remote':
            // Remote output would be implemented here
            break
        }
      } catch (error) {
        console.error('Logger output error:', error)
      }
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.service}]`

    switch (this.config.format) {
      case 'json':
        console.log(JSON.stringify(logEntry))
        break
      case 'structured':
        console.log(prefix, logEntry.message, logEntry.data || '')
        break
      default:
        console.log(`${prefix} ${logEntry.message}`, logEntry.data || '')
    }
  }

  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level)
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!)
      }
      if (filter.until) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.until!)
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
        )
      }
    }

    return filteredLogs
  }

  cleanup(cutoff: number): void {
    this.logs = this.logs.filter(log => log.timestamp > cutoff)
  }
}

/**
 * Metrics Collector
 */
class MetricsCollector {
  private config: MonitoringConfig['metrics']
  private currentMetrics: GatewayMetrics
  private historicalMetrics: GatewayMetrics[] = []

  constructor(config: MonitoringConfig['metrics']) {
    this.config = config
    this.currentMetrics = this.createEmptyMetrics()
  }

  recordCompletion(metrics: CompletionMetrics): void {
    this.currentMetrics.requests.total++
    this.currentMetrics.requests.successful++

    // Update request counts by provider/model
    const providerKey = metrics.provider
    const modelKey = `${metrics.provider}:${metrics.model}`

    this.currentMetrics.requests.byProvider[providerKey] =
      (this.currentMetrics.requests.byProvider[providerKey] || 0) + 1
    this.currentMetrics.requests.byModel[modelKey] =
      (this.currentMetrics.requests.byModel[modelKey] || 0) + 1

    // Update performance metrics
    this.currentMetrics.performance.totalResponseTime += metrics.duration
    this.currentMetrics.performance.responseTimes.push(metrics.duration)

    // Update usage metrics
    if (metrics.usage) {
      this.currentMetrics.usage.totalTokens += metrics.usage.totalTokens
      this.currentMetrics.usage.promptTokens += metrics.usage.promptTokens
      this.currentMetrics.usage.completionTokens += metrics.usage.completionTokens
    }

    // Update cost metrics
    if (metrics.cost) {
      this.currentMetrics.costs.totalCost += metrics.cost
      this.currentMetrics.costs.costByProvider[metrics.provider] =
        (this.currentMetrics.costs.costByProvider[metrics.provider] || 0) + metrics.cost
    }

    // Update cache metrics
    if (metrics.cached) {
      this.currentMetrics.cache.hits++
    }
    this.currentMetrics.cache.requests++
  }

  recordError(metrics: ErrorMetrics): void {
    this.currentMetrics.requests.total++
    this.currentMetrics.requests.failed++

    // Update error counts
    const errorKey = metrics.error.code
    this.currentMetrics.errors.total++
    this.currentMetrics.errors.byCode[errorKey] =
      (this.currentMetrics.errors.byCode[errorKey] || 0) + 1

    // Update error counts by provider
    this.currentMetrics.errors.byProvider[metrics.provider] =
      (this.currentMetrics.errors.byProvider[metrics.provider] || 0) + 1
  }

  recordStreamChunk(requestId: string, chunkIndex: number, size: number): void {
    this.currentMetrics.streaming.chunks++
    this.currentMetrics.streaming.bytes += size
  }

  recordCacheHit(requestId: string): void {
    this.currentMetrics.cache.hits++
  }

  recordRateLimitHit(userId: string, ruleId: string): void {
    this.currentMetrics.rateLimits.hits++
    this.currentMetrics.rateLimits.byUser[userId] =
      (this.currentMetrics.rateLimits.byUser[userId] || 0) + 1
  }

  recordHealthCheck(endpoint: string, status: 'pass' | 'fail' | 'warn', responseTime: number): void {
    const check = {
      endpoint,
      status,
      responseTime,
      timestamp: Date.now()
    }

    this.currentMetrics.health.checks.push(check)

    // Keep only last 100 health checks
    if (this.currentMetrics.health.checks.length > 100) {
      this.currentMetrics.health.checks = this.currentMetrics.health.checks.slice(-100)
    }
  }

  getMetrics(): GatewayMetrics {
    // Calculate derived metrics
    const metrics = { ...this.currentMetrics }

    // Calculate error rate
    metrics.requests.errorRate = metrics.requests.total > 0
      ? (metrics.requests.failed / metrics.requests.total) * 100
      : 0

    // Calculate average response time
    metrics.performance.averageResponseTime = metrics.requests.successful > 0
      ? metrics.performance.totalResponseTime / metrics.requests.successful
      : 0

    // Calculate percentiles
    if (metrics.performance.responseTimes.length > 0) {
      const sortedTimes = [...metrics.performance.responseTimes].sort((a, b) => a - b)
      metrics.performance.p50 = this.calculatePercentile(sortedTimes, 50)
      metrics.performance.p95 = this.calculatePercentile(sortedTimes, 95)
      metrics.performance.p99 = this.calculatePercentile(sortedTimes, 99)
    }

    // Calculate cache hit rate
    metrics.cache.hitRate = metrics.cache.requests > 0
      ? (metrics.cache.hits / metrics.cache.requests) * 100
      : 0

    // Calculate throughput (requests per minute)
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentRequests = this.historicalMetrics
      .filter(m => m.timestamp > oneMinuteAgo)
      .reduce((sum, m) => sum + m.requests.total, 0) + metrics.requests.total

    metrics.performance.throughput = recentRequests

    return metrics
  }

  rotateMetrics(): void {
    // Save current metrics to history
    this.currentMetrics.timestamp = Date.now()
    this.historicalMetrics.push({ ...this.currentMetrics })

    // Keep only metrics within retention period
    const cutoff = Date.now() - this.config.retention
    this.historicalMetrics = this.historicalMetrics.filter(m => m.timestamp > cutoff)

    // Reset current metrics
    this.currentMetrics = this.createEmptyMetrics()
  }

  exportPrometheus(): string {
    const metrics = this.getMetrics()
    const prometheusMetrics: string[] = []

    // Request metrics
    prometheusMetrics.push(`# HELP ai_gateway_requests_total Total number of requests`)
    prometheusMetrics.push(`# TYPE ai_gateway_requests_total counter`)
    prometheusMetrics.push(`ai_gateway_requests_total ${metrics.requests.total}`)

    prometheusMetrics.push(`# HELP ai_gateway_requests_successful_total Total number of successful requests`)
    prometheusMetrics.push(`# TYPE ai_gateway_requests_successful_total counter`)
    prometheusMetrics.push(`ai_gateway_requests_successful_total ${metrics.requests.successful}`)

    prometheusMetrics.push(`# HELP ai_gateway_requests_failed_total Total number of failed requests`)
    prometheusMetrics.push(`# TYPE ai_gateway_requests_failed_total counter`)
    prometheusMetrics.push(`ai_gateway_requests_failed_total ${metrics.requests.failed}`)

    // Performance metrics
    prometheusMetrics.push(`# HELP ai_gateway_response_time_ms Average response time in milliseconds`)
    prometheusMetrics.push(`# TYPE ai_gateway_response_time_ms gauge`)
    prometheusMetrics.push(`ai_gateway_response_time_ms ${metrics.performance.averageResponseTime}`)

    // Usage metrics
    prometheusMetrics.push(`# HELP ai_gateway_tokens_total Total number of tokens processed`)
    prometheusMetrics.push(`# TYPE ai_gateway_tokens_total counter`)
    prometheusMetrics.push(`ai_gateway_tokens_total ${metrics.usage.totalTokens}`)

    // Cost metrics
    prometheusMetrics.push(`# HELP ai_gateway_cost_total Total cost in USD`)
    prometheusMetrics.push(`# TYPE ai_gateway_cost_total counter`)
    prometheusMetrics.push(`ai_gateway_cost_total ${metrics.costs.totalCost}`)

    // Cache metrics
    prometheusMetrics.push(`# HELP ai_gateway_cache_hit_rate Cache hit rate percentage`)
    prometheusMetrics.push(`# TYPE ai_gateway_cache_hit_rate gauge`)
    prometheusMetrics.push(`ai_gateway_cache_hit_rate ${metrics.cache.hitRate}`)

    return prometheusMetrics.join('\n')
  }

  exportCSV(): string {
    const metrics = this.getMetrics()
    const headers = [
      'timestamp',
      'requests_total',
      'requests_successful',
      'requests_failed',
      'average_response_time',
      'total_tokens',
      'total_cost',
      'cache_hit_rate'
    ]

    const row = [
      metrics.timestamp,
      metrics.requests.total,
      metrics.requests.successful,
      metrics.requests.failed,
      metrics.performance.averageResponseTime,
      metrics.usage.totalTokens,
      metrics.costs.totalCost,
      metrics.cache.hitRate
    ]

    return [headers.join(','), row.join(',')].join('\n')
  }

  cleanup(cutoff: number): void {
    this.historicalMetrics = this.historicalMetrics.filter(m => m.timestamp > cutoff)
  }

  private createEmptyMetrics(): GatewayMetrics {
    return {
      timestamp: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        errorRate: 0,
        byProvider: {},
        byModel: {}
      },
      performance: {
        totalResponseTime: 0,
        averageResponseTime: 0,
        responseTimes: [],
        p50: 0,
        p95: 0,
        p99: 0,
        throughput: 0
      },
      usage: {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      },
      costs: {
        totalCost: 0,
        costByProvider: {}
      },
      cache: {
        requests: 0,
        hits: 0,
        hitRate: 0
      },
      streaming: {
        chunks: 0,
        bytes: 0
      },
      rateLimits: {
        hits: 0,
        byUser: {}
      },
      health: {
        checks: []
      },
      errors: {
        total: 0,
        byCode: {},
        byProvider: {}
      }
    }
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)] || 0
  }
}

/**
 * Analytics Service
 */
class AnalyticsService {
  private data: AnalyticsData[] = []

  recordCompletion(metrics: CompletionMetrics): void {
    this.addData({
      timestamp: metrics.timestamp,
      type: 'completion',
      provider: metrics.provider,
      model: metrics.model,
      duration: metrics.duration,
      tokens: metrics.usage?.totalTokens || 0,
      cost: metrics.cost || 0,
      success: true,
      cached: metrics.cached || false
    })
  }

  recordError(metrics: ErrorMetrics): void {
    this.addData({
      timestamp: metrics.timestamp,
      type: 'error',
      provider: metrics.provider,
      model: metrics.model,
      duration: metrics.duration,
      tokens: 0,
      cost: 0,
      success: false,
      errorCode: metrics.error.code
    })
  }

  recordCacheHit(response: AIGatewayResponse): void {
    this.addData({
      timestamp: Date.now(),
      type: 'cache_hit',
      provider: response.provider,
      model: response.model,
      duration: response.metadata.processingTime,
      tokens: response.usage.totalTokens,
      cost: response.metadata.cost || 0,
      success: true,
      cached: true
    })
  }

  recordHealthCheck(endpoint: string, status: string, responseTime: number): void {
    this.addData({
      timestamp: Date.now(),
      type: 'health_check',
      endpoint,
      status,
      responseTime,
      success: status === 'pass'
    })
  }

  getAnalytics(timeRange?: TimeRange): AIGatewayAnalytics {
    let filteredData = this.data

    if (timeRange) {
      const now = Date.now()
      const since = timeRange.since || now - 24 * 60 * 60 * 1000 // Default to 24 hours
      const until = timeRange.until || now

      filteredData = this.data.filter(d => d.timestamp >= since && d.timestamp <= until)
    }

    return this.calculateAnalytics(filteredData)
  }

  cleanup(cutoff: number): void {
    this.data = this.data.filter(d => d.timestamp > cutoff)
  }

  private addData(data: AnalyticsData): void {
    this.data.push(data)

    // Keep only last 10000 entries
    if (this.data.length > 10000) {
      this.data = this.data.slice(-10000)
    }
  }

  private calculateAnalytics(data: AnalyticsData[]): AIGatewayAnalytics {
    const requests = data.filter(d => d.type === 'completion' || d.type === 'error')
    const completions = data.filter(d => d.type === 'completion')
    const errors = data.filter(d => d.type === 'error')

    return {
      requests: {
        total: requests.length,
        successful: completions.length,
        failed: errors.length,
        byProvider: this.groupBy(requests, 'provider'),
        byModel: this.groupBy(requests, 'model'),
        byUser: {}, // Would need user data in analytics
        byProject: {} // Would need project data in analytics
      },
      responses: {
        averageTokens: this.average(completions.map(c => c.tokens)),
        totalTokens: this.sum(completions.map(c => c.tokens)),
        averageResponseTime: this.average(completions.map(c => c.duration)),
        cachedResponses: data.filter(d => d.type === 'cache_hit').length,
        cacheHitRate: this.calculateCacheHitRate(data)
      },
      performance: {
        p50: this.calculatePercentile(completions.map(c => c.duration), 50),
        p95: this.calculatePercentile(completions.map(c => c.duration), 95),
        p99: this.calculatePercentile(completions.map(c => c.duration), 99),
        averageResponseTime: this.average(completions.map(c => c.duration)),
        throughput: this.calculateThroughput(requests),
        errorRate: this.calculateErrorRate(requests)
      },
      costs: {
        totalCost: this.sum(data.map(d => d.cost)),
        costByProvider: this.groupBySum(data, 'provider', 'cost'),
        costByModel: this.groupBySum(data, 'model', 'cost'),
        costByUser: {},
        averageCostPerRequest: this.average(data.map(d => d.cost))
      },
      errors: {
        totalErrors: errors.length,
        errorsByCode: this.groupBy(errors, 'errorCode'),
        errorsByProvider: this.groupBy(errors, 'provider'),
        errorsByType: {}
      }
    }
  }

  private groupBy(data: AnalyticsData[], field: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const key = (item as any)[field] || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private groupBySum(data: AnalyticsData[], groupField: string, sumField: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const key = (item as any)[groupField] || 'unknown'
      const value = (item as any)[sumField] || 0
      acc[key] = (acc[key] || 0) + value
      return acc
    }, {} as Record<string, number>)
  }

  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private sum(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0)
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    const sorted = [...sortedValues].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  private calculateThroughput(requests: AnalyticsData[]): number {
    if (requests.length < 2) return 0
    const timeSpan = requests[requests.length - 1].timestamp - requests[0].timestamp
    return timeSpan > 0 ? (requests.length / timeSpan) * 60000 : 0 // Requests per minute
  }

  private calculateErrorRate(requests: AnalyticsData[]): number {
    if (requests.length === 0) return 0
    const errorCount = requests.filter(r => !r.success).length
    return (errorCount / requests.length) * 100
  }

  private calculateCacheHitRate(data: AnalyticsData[]): number {
    const totalRequests = data.filter(d => d.type === 'completion').length
    const cacheHits = data.filter(d => d.type === 'cache_hit').length
    return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0
  }
}

/**
 * Alert Manager
 */
class AlertManager {
  private config: MonitoringConfig['alerts']
  private rules: AlertRule[] = []
  private activeAlerts: Alert[] = []

  constructor(config: MonitoringConfig['alerts']) {
    this.config = config
    this.rules = [...config.rules]
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule)
  }

  checkMetrics(metrics: CompletionMetrics): void {
    // Check performance alerts
    if (metrics.duration > 10000) { // 10 seconds
      this.triggerAlert('slow_response', 'Slow response time detected', {
        duration: metrics.duration,
        requestId: metrics.requestId
      })
    }

    // Check cost alerts
    if (metrics.cost && metrics.cost > 1.0) { // $1.00
      this.triggerAlert('high_cost', 'High cost request detected', {
        cost: metrics.cost,
        requestId: metrics.requestId
      })
    }
  }

  checkError(metrics: ErrorMetrics): void {
    // Error alerts would be configured through rules
    this.checkRules('error', {
      error: metrics.error,
      provider: metrics.provider
    })
  }

  checkRateLimit(userId: string, ruleId: string): void {
    this.triggerAlert('rate_limit', 'Rate limit exceeded', {
      userId,
      ruleId
    })
  }

  checkHealthCheck(endpoint: string, status: string, responseTime: number): void {
    if (status === 'fail') {
      this.triggerAlert('health_check_failed', 'Health check failed', {
        endpoint,
        responseTime
      })
    }
  }

  checkAlerts(): void {
    // Check rule-based alerts
    // This would implement more sophisticated alert checking based on configured rules
  }

  getAlerts(status?: AlertStatus): Alert[] {
    return status
      ? this.activeAlerts.filter(alert => alert.status === status)
      : [...this.activeAlerts]
  }

  private triggerAlert(code: string, message: string, data?: any): void {
    const existingAlert = this.activeAlerts.find(alert =>
      alert.code === code && alert.status === 'active'
    )

    if (existingAlert) {
      // Update existing alert
      existingAlert.count++
      existingAlert.lastTriggered = Date.now()
      existingAlert.data = data
    } else {
      // Create new alert
      const alert: Alert = {
        id: this.generateAlertId(),
        code,
        message,
        severity: 'medium',
        status: 'active',
        triggeredAt: Date.now(),
        lastTriggered: Date.now(),
        count: 1,
        data
      }

      this.activeAlerts.push(alert)
      this.sendNotification(alert)
    }
  }

  private checkRules(type: string, data: any): void {
    // Implementation for rule-based alert checking
    // This would evaluate the configured alert rules against the data
  }

  private sendNotification(alert: Alert): void {
    // Send alert notifications through configured channels
    for (const channel of this.config.channels) {
      try {
        switch (channel.type) {
          case 'email':
          case 'slack':
          case 'webhook':
          case 'sms':
          case 'console':
            console.warn(`[ALERT] ${alert.code}: ${alert.message}`, alert.data)
            break
          // Other notification types would be implemented here
        }
      } catch (error) {
        console.error('Failed to send alert notification:', error)
      }
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Type Definitions
 */
export interface RequestMetrics {
  requestId: string
  timestamp: number
  provider: string
  model: string
  userId?: string
  projectId?: string
  sessionId?: string
}

export interface CompletionMetrics extends RequestMetrics {
  duration: number
  success: true
  cached?: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  finishReason?: string
}

export interface ErrorMetrics extends RequestMetrics {
  duration: number
  success: false
  error: {
    code: string
    message: string
    provider: string
  }
}

export interface GatewayMetrics {
  timestamp: number
  requests: {
    total: number
    successful: number
    failed: number
    errorRate: number
    byProvider: Record<string, number>
    byModel: Record<string, number>
  }
  performance: {
    totalResponseTime: number
    averageResponseTime: number
    responseTimes: number[]
    p50: number
    p95: number
    p99: number
    throughput: number
  }
  usage: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
  costs: {
    totalCost: number
    costByProvider: Record<string, number>
  }
  cache: {
    requests: number
    hits: number
    hitRate: number
  }
  streaming: {
    chunks: number
    bytes: number
  }
  rateLimits: {
    hits: number
    byUser: Record<string, number>
  }
  health: {
    checks: Array<{
      endpoint: string
      status: string
      responseTime: number
      timestamp: number
    }>
  }
  errors: {
    total: number
    byCode: Record<string, number>
    byProvider: Record<string, number>
  }
}

export interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  data?: any
  service: string
}

export interface LogFilter {
  level?: LogLevel
  since?: number
  until?: number
  search?: string
}

export interface TimeRange {
  since?: number
  until?: number
}

export interface AlertRule {
  id: string
  name: string
  condition: string
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldown: number
}

export interface Alert {
  id: string
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: AlertStatus
  triggeredAt: number
  lastTriggered: number
  count: number
  data?: any
}

export type AlertStatus = 'active' | 'resolved' | 'suppressed'

interface AnalyticsData {
  timestamp: number
  type: string
  provider?: string
  model?: string
  endpoint?: string
  duration?: number
  tokens?: number
  cost?: number
  success: boolean
  cached?: boolean
  errorCode?: string
  status?: string
  responseTime?: number
}

// Export factory function
export function createAIMetricsService(config: MonitoringConfig): AIMetricsService {
  return new AIMetricsService(config)
}