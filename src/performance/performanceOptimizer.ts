/**
 * Performance Optimization Utilities
 * Comprehensive performance monitoring, optimization, and enhancement tools
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'

export interface PerformanceMetrics {
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  network: {
    activeRequests: number
    totalRequests: number
    avgResponseTime: number
    errorRate: number
  }
  ai: {
    tokensPerSecond: number
    avgLatency: number
    cacheHitRate: number
    costPerRequest: number
  }
  database: {
    queryTime: number
    connectionPool: number
    slowQueries: number
  }
  frontend: {
    bundleSize: number
    loadTime: number
    renderTime: number
    interactionTime: number
  }
}

export interface PerformanceThresholds {
  cpu: { warning: number; critical: number }
  memory: { warning: number; critical: number }
  network: { warning: number; critical: number }
  ai: { warning: number; critical: number }
  database: { warning: number; critical: number }
  frontend: { warning: number; critical: number }
}

export interface OptimizationRecommendation {
  type: 'cache' | 'memory' | 'network' | 'ai' | 'database' | 'bundle' | 'rendering'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  implementation: string[]
  estimatedGain: string
}

export interface PerformanceProfile {
  id: string
  name: string
  timestamp: number
  duration: number
  metrics: PerformanceMetrics
  recommendations: OptimizationRecommendation[]
  bottlenecks: string[]
  score: number
}

/**
 * Performance Optimizer Service
 */
export class PerformanceOptimizer extends EventEmitter {
  private thresholds: PerformanceThresholds
  private metrics: PerformanceMetrics
  private profiles: PerformanceProfile[] = []
  private monitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private performanceTimers = new Map<string, number>()
  private requestMetrics = new Map<string, any[]>()
  private optimizationRules: OptimizationRule[]

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super()

    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      network: { warning: 1000, critical: 3000 }, // response time in ms
      ai: { warning: 2000, critical: 5000 }, // latency in ms
      database: { warning: 100, critical: 500 }, // query time in ms
      frontend: { warning: 3000, critical: 8000 }, // load time in ms
      ...thresholds
    }

    this.metrics = this.initializeMetrics()
    this.optimizationRules = this.initializeOptimizationRules()
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 5000): void {
    if (this.monitoring) return

    this.monitoring = true
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.analyzePerformance()
    }, interval)

    this.emit('monitoring:started')
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return

    this.monitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.emit('monitoring:stopped')
  }

  /**
   * Profile a specific operation
   */
  async profile<T>(
    name: string,
    operation: () => Promise<T> | T,
    options?: { category?: string; tags?: string[] }
  ): Promise<{ result: T; profile: PerformanceProfile }> {
    const profileId = this.generateId()
    const startTime = performance.now()
    const startMetrics = { ...this.metrics }

    try {
      // Start profiling
      this.startTimer(profileId)
      this.emit('profile:started', { id: profileId, name })

      // Execute operation
      const result = await operation()

      // End profiling
      const endTime = performance.now()
      const duration = endTime - startTime
      this.endTimer(profileId)

      // Calculate metrics
      const endMetrics = await this.collectMetrics()
      const profileMetrics = this.calculateProfileMetrics(startMetrics, endMetrics, duration)

      // Generate recommendations
      const recommendations = this.generateRecommendations(profileMetrics)
      const bottlenecks = this.identifyBottlenecks(profileMetrics)
      const score = this.calculatePerformanceScore(profileMetrics)

      const profile: PerformanceProfile = {
        id: profileId,
        name,
        timestamp: Date.now(),
        duration,
        metrics: profileMetrics,
        recommendations,
        bottlenecks,
        score
      }

      this.profiles.push(profile)
      this.emit('profile:completed', profile)

      return { result, profile }

    } catch (error) {
      this.endTimer(profileId)
      this.emit('profile:error', { id: profileId, name, error })
      throw error
    }
  }

  /**
   * Monitor an API request
   */
  monitorRequest(requestId: string, provider: string, model: string): {
    start: () => void
    end: (success: boolean, tokenCount?: number) => void
    error: (error: Error) => void
  } {
    const metrics = {
      startTime: 0,
      endTime: 0,
      success: false,
      tokenCount: 0,
      error: null as Error | null
    }

    return {
      start: () => {
        metrics.startTime = performance.now()
        this.startTimer(requestId)
      },
      end: (success: boolean, tokenCount?: number) => {
        metrics.endTime = performance.now()
        metrics.success = success
        metrics.tokenCount = tokenCount || 0
        this.endTimer(requestId)
        this.recordRequestMetrics(requestId, provider, model, metrics)
      },
      error: (error: Error) => {
        metrics.endTime = performance.now()
        metrics.success = false
        metrics.error = error
        this.endTimer(requestId)
        this.recordRequestMetrics(requestId, provider, model, metrics)
      }
    }
  }

  /**
   * Optimize based on current metrics
   */
  async optimize(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Apply optimization rules
    for (const rule of this.optimizationRules) {
      if (rule.condition(this.metrics)) {
        recommendations.push(rule.recommendation)
      }
    }

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    this.emit('optimization:recommendations', recommendations)
    return recommendations
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get performance profiles
   */
  getProfiles(limit?: number): PerformanceProfile[] {
    return limit ? this.profiles.slice(-limit) : [...this.profiles]
  }

  /**
   * Get performance trends
   */
  getTrends(timeWindow: number = 3600000): PerformanceTrends {
    const now = Date.now()
    const recentProfiles = this.profiles.filter(p => now - p.timestamp <= timeWindow)

    if (recentProfiles.length === 0) {
      return {
        cpu: { trend: 'stable', change: 0 },
        memory: { trend: 'stable', change: 0 },
        network: { trend: 'stable', change: 0 },
        ai: { trend: 'stable', change: 0 },
        database: { trend: 'stable', change: 0 }
      }
    }

    const oldest = recentProfiles[0]
    const newest = recentProfiles[recentProfiles.length - 1]

    return {
      cpu: this.calculateTrend(oldest.metrics.cpu.usage, newest.metrics.cpu.usage),
      memory: this.calculateTrend(oldest.metrics.memory.used, newest.metrics.memory.used),
      network: this.calculateTrend(oldest.metrics.network.avgResponseTime, newest.metrics.network.avgResponseTime),
      ai: this.calculateTrend(oldest.metrics.ai.avgLatency, newest.metrics.ai.avgLatency),
      database: this.calculateTrend(oldest.metrics.database.queryTime, newest.metrics.database.queryTime)
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const trends = this.getTrends()
    const recommendations = this.generateRecommendations(this.metrics)
    const bottlenecks = this.identifyBottlenecks(this.metrics)
    const score = this.calculatePerformanceScore(this.metrics)

    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      trends,
      recommendations,
      bottlenecks,
      score,
      status: this.getPerformanceStatus(score),
      insights: this.generateInsights()
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring()
    this.profiles = []
    this.performanceTimers.clear()
    this.requestMetrics.clear()
    this.removeAllListeners()
  }

  // Private methods

  private initializeMetrics(): PerformanceMetrics {
    return {
      cpu: { usage: 0, loadAverage: [0, 0, 0] },
      memory: { used: 0, total: 0, heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      network: { activeRequests: 0, totalRequests: 0, avgResponseTime: 0, errorRate: 0 },
      ai: { tokensPerSecond: 0, avgLatency: 0, cacheHitRate: 0, costPerRequest: 0 },
      database: { queryTime: 0, connectionPool: 0, slowQueries: 0 },
      frontend: { bundleSize: 0, loadTime: 0, renderTime: 0, interactionTime: 0 }
    }
  }

  private initializeOptimizationRules(): OptimizationRule[] {
    return [
      {
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memory.used > this.thresholds.memory.warning,
        recommendation: {
          type: 'memory',
          priority: 'high',
          title: 'Optimize Memory Usage',
          description: 'Memory usage is above threshold. Consider implementing memory optimization strategies.',
          impact: 'Reduce memory consumption by 20-30%',
          effort: 'medium',
          implementation: [
            'Implement object pooling for frequently created objects',
            'Optimize cache sizes and eviction policies',
            'Use streaming for large data processing',
            'Implement lazy loading for non-critical components'
          ],
          estimatedGain: '20-30% memory reduction'
        }
      },
      {
        name: 'High AI Latency',
        condition: (metrics) => metrics.ai.avgLatency > this.thresholds.ai.warning,
        recommendation: {
          type: 'ai',
          priority: 'critical',
          title: 'Reduce AI Response Latency',
          description: 'AI response times are slower than optimal. Implement caching and optimization strategies.',
          impact: 'Reduce AI response time by 50-70%',
          effort: 'high',
          implementation: [
            'Implement intelligent response caching',
            'Use request batching and deduplication',
            'Optimize prompt engineering for faster responses',
            'Implement streaming responses for better UX'
          ],
          estimatedGain: '50-70% latency reduction'
        }
      },
      {
        name: 'Low Cache Hit Rate',
        condition: (metrics) => metrics.ai.cacheHitRate < 70,
        recommendation: {
          type: 'cache',
          priority: 'high',
          title: 'Improve Cache Hit Rate',
          description: 'Cache hit rate is below optimal. Review caching strategies and key generation.',
          impact: 'Improve cache performance and reduce API costs',
          effort: 'medium',
          implementation: [
            'Implement semantic similarity caching',
            'Optimize cache key generation',
            'Adjust TTL values based on usage patterns',
            'Implement predictive preloading'
          ],
          estimatedGain: '30-50% cache hit rate improvement'
        }
      },
      {
        name: 'High Network Latency',
        condition: (metrics) => metrics.network.avgResponseTime > this.thresholds.network.warning,
        recommendation: {
          type: 'network',
          priority: 'medium',
          title: 'Optimize Network Performance',
          description: 'Network response times are slower than optimal. Consider network optimizations.',
          impact: 'Reduce network latency by 30-40%',
          effort: 'medium',
          implementation: [
            'Implement request batching',
            'Use HTTP/2 for parallel requests',
            'Optimize API response sizes',
            'Implement CDN for static assets'
          ],
          estimatedGain: '30-40% latency reduction'
        }
      }
    ]
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    // Collect CPU metrics
    const cpuUsage = process.cpuUsage()
    this.metrics.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
    this.metrics.cpu.loadAverage = process.cpuUsage ? [0, 0, 0] : [0, 0, 0] // Placeholder

    // Collect memory metrics
    const memUsage = process.memoryUsage()
    this.metrics.memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    }

    // Calculate network metrics from request tracking
    this.calculateNetworkMetrics()

    // Calculate AI metrics from request tracking
    this.calculateAIMetrics()

    return this.metrics
  }

  private calculateNetworkMetrics(): void {
    let totalResponseTime = 0
    let errorCount = 0
    let requestCount = 0

    for (const metrics of this.requestMetrics.values()) {
      for (const metric of metrics) {
        if (metric.endTime && metric.startTime) {
          totalResponseTime += metric.endTime - metric.startTime
          requestCount++
          if (!metric.success) errorCount++
        }
      }
    }

    this.metrics.network.avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0
    this.metrics.network.errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0
    this.metrics.network.totalRequests = requestCount
    this.metrics.network.activeRequests = this.performanceTimers.size
  }

  private calculateAIMetrics(): void {
    let totalLatency = 0
    let totalTokens = 0
    let aiRequestCount = 0

    for (const [requestId, metrics] of this.requestMetrics) {
      for (const metric of metrics) {
        if (metric.endTime && metric.startTime && metric.tokenCount > 0) {
          totalLatency += metric.endTime - metric.startTime
          totalTokens += metric.tokenCount
          aiRequestCount++
        }
      }
    }

    this.metrics.ai.avgLatency = aiRequestCount > 0 ? totalLatency / aiRequestCount : 0
    this.metrics.ai.tokensPerSecond = aiRequestCount > 0 ? totalTokens / (totalLatency / 1000) : 0
  }

  private analyzePerformance(): void {
    // Check thresholds and emit warnings
    this.checkThresholds()

    // Emit metrics update
    this.emit('metrics:updated', this.metrics)
  }

  private checkThresholds(): void {
    // CPU threshold check
    if (this.metrics.cpu.usage > this.thresholds.cpu.critical) {
      this.emit('alert:critical', { type: 'cpu', value: this.metrics.cpu.usage })
    } else if (this.metrics.cpu.usage > this.thresholds.cpu.warning) {
      this.emit('alert:warning', { type: 'cpu', value: this.metrics.cpu.usage })
    }

    // Memory threshold check
    const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.total) * 100
    if (memoryUsagePercent > this.thresholds.memory.critical) {
      this.emit('alert:critical', { type: 'memory', value: memoryUsagePercent })
    } else if (memoryUsagePercent > this.thresholds.memory.warning) {
      this.emit('alert:warning', { type: 'memory', value: memoryUsagePercent })
    }

    // Network threshold check
    if (this.metrics.network.avgResponseTime > this.thresholds.network.critical) {
      this.emit('alert:critical', { type: 'network', value: this.metrics.network.avgResponseTime })
    } else if (this.metrics.network.avgResponseTime > this.thresholds.network.warning) {
      this.emit('alert:warning', { type: 'network', value: this.metrics.network.avgResponseTime })
    }

    // AI threshold check
    if (this.metrics.ai.avgLatency > this.thresholds.ai.critical) {
      this.emit('alert:critical', { type: 'ai', value: this.metrics.ai.avgLatency })
    } else if (this.metrics.ai.avgLatency > this.thresholds.ai.warning) {
      this.emit('alert:warning', { type: 'ai', value: this.metrics.ai.avgLatency })
    }
  }

  private startTimer(id: string): void {
    this.performanceTimers.set(id, performance.now())
  }

  private endTimer(id: string): number {
    const startTime = this.performanceTimers.get(id)
    if (!startTime) return 0

    const endTime = performance.now()
    const duration = endTime - startTime
    this.performanceTimers.delete(id)

    return duration
  }

  private recordRequestMetrics(requestId: string, provider: string, model: string, metrics: any): void {
    if (!this.requestMetrics.has(requestId)) {
      this.requestMetrics.set(requestId, [])
    }

    this.requestMetrics.get(requestId)!.push({
      ...metrics,
      provider,
      model,
      timestamp: Date.now()
    })

    // Keep only last 100 metrics per request
    const requestMetrics = this.requestMetrics.get(requestId)!
    if (requestMetrics.length > 100) {
      this.requestMetrics.set(requestId, requestMetrics.slice(-100))
    }
  }

  private calculateProfileMetrics(start: PerformanceMetrics, end: PerformanceMetrics, duration: number): PerformanceMetrics {
    return {
      cpu: { usage: end.cpu.usage, loadAverage: end.cpu.loadAverage },
      memory: { ...end.memory },
      network: { ...end.network },
      ai: { ...end.ai },
      database: { ...end.database },
      frontend: { loadTime: duration, ...end.frontend }
    }
  }

  private generateRecommendations(metrics: PerformanceMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []

    for (const rule of this.optimizationRules) {
      if (rule.condition(metrics)) {
        recommendations.push(rule.recommendation)
      }
    }

    return recommendations
  }

  private identifyBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = []

    if (metrics.memory.used / metrics.memory.total > 0.8) {
      bottlenecks.push('High memory usage')
    }

    if (metrics.ai.avgLatency > this.thresholds.ai.warning) {
      bottlenecks.push('AI response latency')
    }

    if (metrics.network.avgResponseTime > this.thresholds.network.warning) {
      bottlenecks.push('Network response time')
    }

    if (metrics.ai.cacheHitRate < 70) {
      bottlenecks.push('Low cache hit rate')
    }

    return bottlenecks
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100

    // Memory score (30% weight)
    const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100
    score -= Math.max(0, memoryUsagePercent - 50) * 0.6

    // AI performance score (25% weight)
    const aiLatencyScore = Math.max(0, 100 - (metrics.ai.avgLatency / 100))
    score -= (100 - aiLatencyScore) * 0.25

    // Network performance score (20% weight)
    const networkScore = Math.max(0, 100 - (metrics.network.avgResponseTime / 50))
    score -= (100 - networkScore) * 0.2

    // Cache performance score (15% weight)
    const cacheScore = metrics.ai.cacheHitRate || 0
    score -= (100 - cacheScore) * 0.15

    // Error rate score (10% weight)
    const errorScore = Math.max(0, 100 - metrics.network.errorRate * 2)
    score -= (100 - errorScore) * 0.1

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  private calculateTrend(oldValue: number, newValue: number): { trend: 'improving' | 'degrading' | 'stable'; change: number } {
    const change = ((newValue - oldValue) / oldValue) * 100

    if (Math.abs(change) < 5) {
      return { trend: 'stable', change }
    }

    return {
      trend: change > 0 ? 'degrading' : 'improving',
      change
    }
  }

  private getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 60) return 'fair'
    if (score >= 40) return 'poor'
    return 'critical'
  }

  private generateInsights(): string[] {
    const insights: string[] = []

    if (this.metrics.ai.cacheHitRate < 70) {
      insights.push('Implementing semantic caching could improve AI response times by up to 60%')
    }

    if (this.metrics.ai.avgLatency > 2000) {
      insights.push('Request batching could reduce AI API calls by 40% and improve response times')
    }

    if (this.metrics.memory.used / this.metrics.memory.total > 0.8) {
      insights.push('Memory optimization could prevent crashes and improve overall performance')
    }

    if (this.metrics.network.avgResponseTime > 1000) {
      insights.push('Network optimization including HTTP/2 and CDN could improve user experience')
    }

    return insights
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Interfaces
interface OptimizationRule {
  name: string
  condition: (metrics: PerformanceMetrics) => boolean
  recommendation: OptimizationRecommendation
}

interface PerformanceTrends {
  cpu: { trend: 'improving' | 'degrading' | 'stable'; change: number }
  memory: { trend: 'improving' | 'degrading' | 'stable'; change: number }
  network: { trend: 'improving' | 'degrading' | 'stable'; change: number }
  ai: { trend: 'improving' | 'degrading' | 'stable'; change: number }
  database: { trend: 'improving' | 'degrading' | 'stable'; change: number }
}

interface PerformanceReport {
  timestamp: number
  metrics: PerformanceMetrics
  trends: PerformanceTrends
  recommendations: OptimizationRecommendation[]
  bottlenecks: string[]
  score: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  insights: string[]
}

// Factory function
export function createPerformanceOptimizer(thresholds?: Partial<PerformanceThresholds>): PerformanceOptimizer {
  return new PerformanceOptimizer(thresholds)
}