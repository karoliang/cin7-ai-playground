/**
 * Database Query Optimizer
 * Advanced query optimization, caching, and performance enhancement for database operations
 */

import { EventEmitter } from 'events'

export interface QueryConfig {
  caching: {
    enabled: boolean
    defaultTTL: number
    maxSize: number
    strategies: ('memory' | 'redis')[]
  }
  optimization: {
    enabled: boolean
    autoIndexSuggestions: boolean
    queryRewriting: boolean
    connectionPooling: boolean
  }
  monitoring: {
    enabled: boolean
    slowQueryThreshold: number
    logQueries: boolean
    trackExplainPlans: boolean
  }
  performance: {
    maxConcurrentQueries: number
    queryTimeout: number
    retryAttempts: number
    batchSize: number
  }
}

export interface QueryPlan {
  query: string
  parameters: any[]
  planId: string
  estimatedCost: number
  executionTime: number
  indexes: string[]
  optimization: {
    addedIndexes: string[]
    rewrittenQuery: string
    optimizations: string[]
  }
}

export interface QueryCache {
  key: string
  result: any
  timestamp: number
  ttl: number
  hitCount: number
  query: string
  parameters: any[]
}

export interface QueryMetrics {
  totalQueries: number
  cacheHits: number
  cacheMisses: number
  slowQueries: number
  averageExecutionTime: number
  totalExecutionTime: number
  errors: number
  concurrentQueries: number
  queryTypes: { [type: string]: number }
  indexUsage: { [index: string]: number }
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema' | 'connection'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  query?: string
  recommendation: string
  estimatedImprovement: string
  implementation: string[]
}

/**
 * Database Query Optimizer Service
 */
export class QueryOptimizer extends EventEmitter {
  private config: QueryConfig
  private queryCache = new Map<string, QueryCache>()
  private queryPlans = new Map<string, QueryPlan>()
  private activeQueries = new Set<string>()
  private slowQueries: QueryPlan[] = []
  private metrics: QueryMetrics
  private connectionPool: ConnectionPool
  private indexAnalyzer: IndexAnalyzer
  private queryRewriter: QueryRewriter
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<QueryConfig> = {}) {
    super()

    this.config = {
      caching: {
        enabled: true,
        defaultTTL: 300000, // 5 minutes
        maxSize: 1000,
        strategies: ['memory']
      },
      optimization: {
        enabled: true,
        autoIndexSuggestions: true,
        queryRewriting: true,
        connectionPooling: true
      },
      monitoring: {
        enabled: true,
        slowQueryThreshold: 1000, // 1 second
        logQueries: true,
        trackExplainPlans: true
      },
      performance: {
        maxConcurrentQueries: 10,
        queryTimeout: 30000, // 30 seconds
        retryAttempts: 3,
        batchSize: 100
      },
      ...config
    }

    this.metrics = this.initializeMetrics()
    this.connectionPool = new ConnectionPool(this.config.performance)
    this.indexAnalyzer = new IndexAnalyzer()
    this.queryRewriter = new QueryRewriter()
    this.startCleanupTimer()
  }

  /**
   * Execute a query with optimization
   */
  async executeQuery<T = any>(
    query: string,
    parameters: any[] = [],
    options?: {
      useCache?: boolean
      ttl?: number
      priority?: 'low' | 'normal' | 'high'
      type?: string
    }
  ): Promise<T> {
    const queryId = this.generateQueryId(query, parameters)
    const startTime = Date.now()

    try {
      // Check concurrent query limit
      if (this.activeQueries.size >= this.config.performance.maxConcurrentQueries) {
        throw new Error('Maximum concurrent queries exceeded')
      }

      this.activeQueries.add(queryId)
      this.metrics.totalQueries++

      // Check cache first
      if (options?.useCache !== false && this.config.caching.enabled) {
        const cachedResult = await this.getFromCache(queryId, query, parameters)
        if (cachedResult !== null) {
          this.metrics.cacheHits++
          this.emit('query:cache-hit', { queryId, query })
          return cachedResult
        }
        this.metrics.cacheMisses++
      }

      // Optimize query
      let optimizedQuery = query
      let optimizedParameters = parameters
      let optimizationInfo: QueryPlan | null = null

      if (this.config.optimization.enabled) {
        optimizationInfo = await this.optimizeQuery(query, parameters)
        optimizedQuery = optimizationInfo.optimization.rewrittenQuery || query
        optimizedParameters = this.adjustParametersForRewrite(parameters, optimizationInfo)
      }

      // Execute query
      const result = await this.executeOptimizedQuery(optimizedQuery, optimizedParameters, queryId)

      const executionTime = Date.now() - startTime
      this.updateMetrics(executionTime, options?.type)

      // Cache result
      if (this.config.caching.enabled && this.shouldCacheResult(result)) {
        await this.setCache(queryId, result, query, parameters, options?.ttl)
      }

      // Track slow queries
      if (executionTime > this.config.monitoring.slowQueryThreshold) {
        this.trackSlowQuery(optimizationInfo || { query, parameters, planId: queryId, estimatedCost: 0, executionTime, indexes: [], optimization: { addedIndexes: [], rewrittenQuery: query, optimizations: [] } })
      }

      this.emit('query:executed', {
        queryId,
        query,
        executionTime,
        cached: false,
        optimization: optimizationInfo
      })

      return result

    } catch (error) {
      this.metrics.errors++
      this.emit('query:error', { queryId, query, error })
      throw error

    } finally {
      this.activeQueries.delete(queryId)
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T = any>(
    queries: Array<{ query: string; parameters?: any[] }>,
    options?: {
      isolationLevel?: 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
      timeout?: number
    }
  ): Promise<T[]> {
    const transactionId = this.generateId()
    const startTime = Date.now()

    try {
      this.emit('transaction:started', { transactionId, queryCount: queries.length })

      const results: T[] = []

      // In a real implementation, this would use database transactions
      for (const { query, parameters = [] } of queries) {
        const result = await this.executeQuery(query, parameters, { useCache: false })
        results.push(result)
      }

      const executionTime = Date.now() - startTime
      this.emit('transaction:completed', { transactionId, executionTime, resultCount: results.length })

      return results

    } catch (error) {
      this.emit('transaction:failed', { transactionId, error })
      throw error
    }
  }

  /**
   * Batch insert/update operations
   */
  async batchExecute(
    operation: 'insert' | 'update' | 'delete',
    table: string,
    data: any[],
    options?: {
      batchSize?: number
      conflictResolution?: 'ignore' | 'update' | 'error'
    }
  ): Promise<{ affectedRows: number; errors: any[] }> {
    const batchSize = options?.batchSize || this.config.performance.batchSize
    const affectedRows = 0
    const errors: any[] = []

    this.emit('batch:started', { operation, table, recordCount: data.length })

    try {
      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const batchResult = await this.executeBatch(operation, table, batch, options)
        // affectedRows += batchResult.affectedRows
        // errors.push(...batchResult.errors)
      }

      this.emit('batch:completed', { operation, table, affectedRows, errorCount: errors.length })
      return { affectedRows, errors }

    } catch (error) {
      this.emit('batch:failed', { operation, table, error })
      throw error
    }
  }

  /**
   * Analyze query performance and provide suggestions
   */
  async analyzePerformance(): Promise<{
    metrics: QueryMetrics
    suggestions: OptimizationSuggestion[]
    slowQueries: QueryPlan[]
    indexUsage: { [index: string]: number }
  }> {
    const suggestions = await this.generateOptimizationSuggestions()
    const indexUsage = this.analyzeIndexUsage()

    return {
      metrics: this.metrics,
      suggestions,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      indexUsage
    }
  }

  /**
   * Get query execution plan
   */
  async explainQuery(query: string, parameters: any[] = []): Promise<QueryPlan> {
    const queryId = this.generateQueryId(query, parameters)

    // Check if we already have a plan
    if (this.queryPlans.has(queryId)) {
      return this.queryPlans.get(queryId)!
    }

    // Generate new plan
    const plan = await this.generateQueryPlan(query, parameters)
    this.queryPlans.set(queryId, plan)

    return plan
  }

  /**
   * Suggest indexes for better performance
   */
  async suggestIndexes(queries?: string[]): Promise<OptimizationSuggestion[]> {
    const targetQueries = queries || this.getRecentQueries()
    const suggestions: OptimizationSuggestion[] = []

    for (const query of targetQueries) {
      const queryPlan = await this.explainQuery(query)
      const indexSuggestions = this.indexAnalyzer.analyzeQuery(query, queryPlan)

      for (const suggestion of indexSuggestions) {
        suggestions.push({
          type: 'index',
          priority: suggestion.priority,
          description: `Add index for better query performance`,
          impact: `Could improve query performance by ${suggestion.estimatedImprovement}`,
          query,
          recommendation: `CREATE INDEX ${suggestion.indexName} ON ${suggestion.table}(${suggestion.columns.join(', ')})`,
          estimatedImprovement: suggestion.estimatedImprovement,
          implementation: [
            `Analyze query patterns and access frequency`,
            `Create composite index if multiple columns are used together`,
            `Monitor index usage and performance impact`
          ]
        })
      }
    }

    return suggestions
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const [key, cache] of this.queryCache) {
        if (cache.query.includes(pattern)) {
          this.queryCache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear()
    }

    this.emit('cache:cleared', { pattern })
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueryMetrics & { cacheHitRate: number } {
    return {
      ...this.metrics,
      concurrentQueries: this.activeQueries.size,
      cacheHitRate: this.metrics.totalQueries > 0
        ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100
        : 0
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.queryCache.clear()
    this.queryPlans.clear()
    this.slowQueries = []
    this.connectionPool.cleanup()
    this.removeAllListeners()
  }

  // Private methods

  private initializeMetrics(): QueryMetrics {
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      errors: 0,
      concurrentQueries: 0,
      queryTypes: {},
      indexUsage: {}
    }
  }

  private generateQueryId(query: string, parameters: any[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim()
    const paramsHash = this.hashParameters(parameters)
    return `${this.hashString(normalizedQuery)}_${paramsHash}`
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

  private hashParameters(parameters: any[]): string {
    return this.hashString(JSON.stringify(parameters))
  }

  private async getFromCache(key: string, query: string, parameters: any[]): Promise<any | null> {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key)
      return null
    }

    // Update hit count
    cached.hitCount++
    return cached.result
  }

  private async setCache(
    key: string,
    result: any,
    query: string,
    parameters: any[],
    ttl?: number
  ): Promise<void> {
    // Check cache size limit
    if (this.queryCache.size >= this.config.caching.maxSize) {
      this.evictOldestCacheEntries()
    }

    const cache: QueryCache = {
      key,
      result,
      timestamp: Date.now(),
      ttl: ttl || this.config.caching.defaultTTL,
      hitCount: 1,
      query,
      parameters
    }

    this.queryCache.set(key, cache)
  }

  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.queryCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    // Remove oldest 25% of entries
    const removeCount = Math.floor(entries.length * 0.25)
    for (let i = 0; i < removeCount; i++) {
      this.queryCache.delete(entries[i][0])
    }
  }

  private shouldCacheResult(result: any): boolean {
    // Don't cache very large results
    const resultSize = JSON.stringify(result).length
    if (resultSize > 100000) return false // 100KB limit

    // Don't cache error results
    if (result && typeof result === 'object' && result.error) return false

    return true
  }

  private async optimizeQuery(query: string, parameters: any[]): Promise<QueryPlan> {
    const queryId = this.generateQueryId(query, parameters)

    // Check if we already have an optimized plan
    if (this.queryPlans.has(queryId)) {
      return this.queryPlans.get(queryId)!
    }

    // Generate optimization plan
    const plan: QueryPlan = {
      query,
      parameters,
      planId: queryId,
      estimatedCost: this.estimateQueryCost(query),
      executionTime: 0,
      indexes: this.extractIndexesFromQuery(query),
      optimization: {
        addedIndexes: [],
        rewrittenQuery: query,
        optimizations: []
      }
    }

    // Apply query rewriting
    if (this.config.optimization.queryRewriting) {
      const rewriteResult = this.queryRewriter.rewrite(query, parameters)
      plan.optimization.rewrittenQuery = rewriteResult.query
      plan.optimization.optimizations = rewriteResult.optimizations
    }

    // Analyze index usage
    const indexSuggestions = this.indexAnalyzer.analyzeQuery(query, plan)
    plan.optimization.addedIndexes = indexSuggestions.map(s => s.indexName)

    this.queryPlans.set(queryId, plan)
    return plan
  }

  private adjustParametersForRewrite(parameters: any[], plan: QueryPlan): any[] {
    // Adjust parameters based on query rewriting
    // In a real implementation, this would handle parameter reordering
    return parameters
  }

  private async executeOptimizedQuery(query: string, parameters: any[], queryId: string): Promise<any> {
    // Get connection from pool
    const connection = await this.connectionPool.getConnection()

    try {
      // Execute query with timeout
      const result = await this.executeWithTimeout(query, parameters, this.config.performance.queryTimeout)

      // Return connection to pool
      this.connectionPool.releaseConnection(connection)

      return result

    } catch (error) {
      // Return connection to pool even on error
      this.connectionPool.releaseConnection(connection)
      throw error
    }
  }

  private async executeWithTimeout(query: string, parameters: any[], timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Query timeout'))
      }, timeout)

      // In a real implementation, this would execute the actual database query
      // For now, simulate query execution
      setTimeout(() => {
        clearTimeout(timer)
        resolve(this.simulateQueryResult(query, parameters))
      }, 100 + Math.random() * 500)
    })
  }

  private simulateQueryResult(query: string, parameters: any[]): any {
    // Simulate different types of query results
    if (query.toLowerCase().includes('select')) {
      return {
        rows: [
          { id: 1, name: 'Sample Data 1', created_at: new Date() },
          { id: 2, name: 'Sample Data 2', created_at: new Date() }
        ],
        rowCount: 2
      }
    } else if (query.toLowerCase().includes('insert')) {
      return {
        rows: [{ id: 3 }],
        rowCount: 1
      }
    } else if (query.toLowerCase().includes('update')) {
      return {
        rows: [],
        rowCount: 1
      }
    } else {
      return {
        rows: [],
        rowCount: 0
      }
    }
  }

  private updateMetrics(executionTime: number, queryType?: string): void {
    this.metrics.totalExecutionTime += executionTime
    this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.totalQueries

    if (executionTime > this.config.monitoring.slowQueryThreshold) {
      this.metrics.slowQueries++
    }

    if (queryType) {
      this.metrics.queryTypes[queryType] = (this.metrics.queryTypes[queryType] || 0) + 1
    }
  }

  private trackSlowQuery(plan: QueryPlan): void {
    this.slowQueries.push(plan)

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-100)
    }

    this.emit('query:slow', plan)
  }

  private estimateQueryCost(query: string): number {
    // Simple cost estimation based on query complexity
    let cost = 1

    // Add cost for complex operations
    if (query.toLowerCase().includes('join')) cost += 5
    if (query.toLowerCase().includes('group by')) cost += 3
    if (query.toLowerCase().includes('order by')) cost += 2
    if (query.toLowerCase().includes('where')) cost += 1

    // Add cost for subqueries
    const subqueryCount = (query.match(/\(/g) || []).length
    cost += subqueryCount * 2

    return cost
  }

  private extractIndexesFromQuery(query: string): string[] {
    const indexes: string[] = []

    // Extract columns from WHERE clauses
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/i)
    if (whereMatch) {
      const columns = this.extractColumnsFromClause(whereMatch[1])
      indexes.push(...columns)
    }

    // Extract columns from JOIN conditions
    const joinMatches = query.match(/join\s+.+?\s+on\s+(.+?)(?:\s+join|$)/gi)
    if (joinMatches) {
      for (const join of joinMatches) {
        const columns = this.extractColumnsFromClause(join)
        indexes.push(...columns)
      }
    }

    return [...new Set(indexes)]
  }

  private extractColumnsFromClause(clause: string): string[] {
    const columns: string[] = []

    // Simple column extraction - would be more sophisticated in production
    const columnMatches = clause.match(/(\w+)\s*(?:=|>|<|>=|<=|like|in)/gi)
    if (columnMatches) {
      for (const match of columnMatches) {
        const column = match.split(/\s+/)[0]
        if (column && !column.toLowerCase().includes('and') && !column.toLowerCase().includes('or')) {
          columns.push(column)
        }
      }
    }

    return columns
  }

  private getRecentQueries(): string[] {
    // Get recent queries from metrics or logs
    // In a real implementation, this would query a query log table
    return [
      'SELECT * FROM projects WHERE user_id = ?',
      'SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC',
      'UPDATE projects SET updated_at = ? WHERE id = ?'
    ]
  }

  private async generateOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // Cache hit rate suggestions
    const cacheHitRate = this.metrics.totalQueries > 0
      ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100
      : 0

    if (cacheHitRate < 50 && this.config.caching.enabled) {
      suggestions.push({
        type: 'query',
        priority: 'medium',
        description: 'Low cache hit rate detected',
        impact: 'Improve response times and reduce database load',
        recommendation: 'Review caching strategy and increase TTL for frequently accessed data',
        estimatedImprovement: '30-50% faster response times',
        implementation: [
          'Analyze query patterns and access frequency',
          'Increase cache TTL for stable data',
          'Implement cache warming strategies'
        ]
      })
    }

    // Slow query suggestions
    if (this.metrics.slowQueries > 0) {
      suggestions.push({
        type: 'query',
        priority: 'high',
        description: `${this.metrics.slowQueries} slow queries detected`,
        impact: 'Significant performance improvement possible',
        recommendation: 'Optimize slow queries or add appropriate indexes',
        estimatedImprovement: '50-80% faster query execution',
        implementation: [
          'Review query execution plans',
          'Add missing indexes',
          'Rewrite inefficient queries',
          'Consider query result caching'
        ]
      })
    }

    // Index usage suggestions
    const indexSuggestions = await this.suggestIndexes()
    suggestions.push(...indexSuggestions)

    return suggestions
  }

  private analyzeIndexUsage(): { [index: string]: number } {
    // Analyze index usage from query plans
    const indexUsage: { [index: string]: number } = {}

    for (const plan of this.queryPlans.values()) {
      for (const index of plan.indexes) {
        indexUsage[index] = (indexUsage[index] || 0) + 1
      }
    }

    return indexUsage
  }

  private async executeBatch(
    operation: 'insert' | 'update' | 'delete',
    table: string,
    data: any[],
    options?: any
  ): Promise<{ affectedRows: number; errors: any[] }> {
    // Simulate batch operation
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      affectedRows: data.length,
      errors: []
    }
  }

  private async generateQueryPlan(query: string, parameters: any[]): Promise<QueryPlan> {
    // Simulate query plan generation
    return {
      query,
      parameters,
      planId: this.generateQueryId(query, parameters),
      estimatedCost: this.estimateQueryCost(query),
      executionTime: 0,
      indexes: this.extractIndexesFromQuery(query),
      optimization: {
        addedIndexes: [],
        rewrittenQuery: query,
        optimizations: []
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCache()
      this.cleanupOldQueryPlans()
    }, 300000) // Run every 5 minutes
  }

  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [key, cache] of this.queryCache) {
      if (now - cache.timestamp > cache.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  private cleanupOldQueryPlans(): void {
    // Keep only last 1000 query plans
    if (this.queryPlans.size > 1000) {
      const plans = Array.from(this.queryPlans.entries())
      plans.sort((a, b) => a[1].planId.localeCompare(b[1].planId))

      const removeCount = plans.length - 1000
      for (let i = 0; i < removeCount; i++) {
        this.queryPlans.delete(plans[i][0])
      }
    }
  }
}

// Supporting classes

class ConnectionPool {
  private connections: any[] = []
  private busyConnections = new Set<any>()
  private config: any

  constructor(config: any) {
    this.config = config
  }

  async getConnection(): Promise<any> {
    // Find available connection
    const available = this.connections.find(conn => !this.busyConnections.has(conn))

    if (available) {
      this.busyConnections.add(available)
      return available
    }

    // Create new connection if under limit
    if (this.connections.length < this.config.maxConcurrentQueries) {
      const connection = { id: Math.random().toString(36) }
      this.connections.push(connection)
      this.busyConnections.add(connection)
      return connection
    }

    // Wait for available connection
    throw new Error('No available connections')
  }

  releaseConnection(connection: any): void {
    this.busyConnections.delete(connection)
  }

  cleanup(): void {
    this.connections = []
    this.busyConnections.clear()
  }
}

class IndexAnalyzer {
  analyzeQuery(query: string, plan: QueryPlan): Array<{
    indexName: string
    table: string
    columns: string[]
    priority: 'low' | 'medium' | 'high'
    estimatedImprovement: string
  }> {
    const suggestions: any[] = []

    // Simple index analysis - would be more sophisticated in production
    if (query.toLowerCase().includes('where') && !query.toLowerCase().includes('index')) {
      suggestions.push({
        indexName: `idx_temp_${Date.now()}`,
        table: 'unknown_table',
        columns: ['id'],
        priority: 'medium',
        estimatedImprovement: '50-70%'
      })
    }

    return suggestions
  }
}

class QueryRewriter {
  rewrite(query: string, parameters: any[]): {
    query: string
    parameters: any[]
    optimizations: string[]
  } {
    const optimizations: string[] = []
    let rewrittenQuery = query

    // Simple query rewrites
    if (query.toLowerCase().includes('select *')) {
      rewrittenQuery = rewrittenQuery.replace(/select \*/i, 'SELECT id, name, created_at')
      optimizations.push('Replaced SELECT * with specific columns')
    }

    if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {
      rewrittenQuery += ' LIMIT 100'
      optimizations.push('Added LIMIT to prevent large result sets')
    }

    return {
      query: rewrittenQuery,
      parameters,
      optimizations
    }
  }
}

// Factory function
export function createQueryOptimizer(config?: Partial<QueryConfig>): QueryOptimizer {
  return new QueryOptimizer(config)
}