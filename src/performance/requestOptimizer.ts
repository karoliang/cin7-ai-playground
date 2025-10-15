/**
 * Request Optimization Service
 * Intelligent request deduplication, batching, and optimization for AI API calls
 */

import { EventEmitter } from 'events'
import { createHash } from 'crypto'

export interface RequestConfig {
  deduplication: {
    enabled: boolean
    windowSize: number // ms to consider requests duplicate
    maxPendingRequests: number
  }
  batching: {
    enabled: boolean
    maxBatchSize: number
    maxWaitTime: number // ms to wait for batch
    groupingStrategy: 'provider' | 'model' | 'user' | 'project'
  }
  optimization: {
    enabled: boolean
    mergeSimilarRequests: boolean
    prioritizeByCost: boolean
    enableRequestStreaming: boolean
  }
  throttling: {
    enabled: boolean
    requestsPerSecond: number
    burstCapacity: number
  }
}

export interface OptimizedRequest {
  id: string
  originalId: string
  provider: string
  model: string
  prompt: string
  options: any
  context: any
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: number
  userId?: string
  projectId?: string
  metadata: {
    estimatedTokens: number
    estimatedCost: number
    deduplicationKey?: string
    batchKey?: string
  }
}

export interface RequestBatch {
  id: string
  requests: OptimizedRequest[]
  provider: string
  model: string
  createdAt: number
  maxWaitTime: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  error?: Error
}

export interface DeduplicationEntry {
  requestId: string
  promise: Promise<any>
  timestamp: number
  requestCount: number
}

export interface RequestStats {
  total: number
  deduplicated: number
  batched: number
  optimized: number
  failed: number
  averageLatency: number
  costSavings: number
  batchEfficiency: number
  deduplicationRate: number
}

/**
 * Request Optimizer Service
 */
export class RequestOptimizer extends EventEmitter {
  private config: RequestConfig
  private pendingRequests = new Map<string, OptimizedRequest>()
  private duplicateRequests = new Map<string, DeduplicationEntry>()
  private batchQueues = new Map<string, OptimizedRequest[]>()
  private activeBatches = new Map<string, RequestBatch>()
  private processingBatches = new Set<string>()
  private throttleTokens = new Map<string, number>()
  private stats: RequestStats
  private batchTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<RequestConfig> = {}) {
    super()

    this.config = {
      deduplication: {
        enabled: true,
        windowSize: 5000, // 5 seconds
        maxPendingRequests: 100
      },
      batching: {
        enabled: true,
        maxBatchSize: 10,
        maxWaitTime: 2000, // 2 seconds
        groupingStrategy: 'provider'
      },
      optimization: {
        enabled: true,
        mergeSimilarRequests: true,
        prioritizeByCost: true,
        enableRequestStreaming: true
      },
      throttling: {
        enabled: true,
        requestsPerSecond: 10,
        burstCapacity: 20
      },
      ...config
    }

    this.stats = this.initializeStats()
    this.startTimers()
  }

  /**
   * Submit a request for optimization
   */
  async submitRequest(request: Omit<OptimizedRequest, 'id' | 'metadata'>): Promise<any> {
    const requestId = this.generateId()
    const optimizedRequest: OptimizedRequest = {
      ...request,
      id: requestId,
      originalId: request.originalId || requestId,
      metadata: {
        estimatedTokens: this.estimateTokens(request.prompt),
        estimatedCost: this.estimateCost(request.provider, request.model, request.prompt)
      }
    }

    this.stats.total++

    try {
      // Check for duplicate requests
      if (this.config.deduplication.enabled) {
        const duplicateKey = this.generateDeduplicationKey(optimizedRequest)
        const duplicate = this.duplicateRequests.get(duplicateKey)

        if (duplicate) {
          duplicate.requestCount++
          this.stats.deduplicated++
          this.emit('request:deduplicated', { requestId, duplicateKey, originalId: duplicate.requestId })
          return duplicate.promise
        }
      }

      // Check throttling
      if (this.config.throttling.enabled) {
        await this.checkThrottle(optimizedRequest)
      }

      // Apply optimizations
      if (this.config.optimization.enabled) {
        await this.applyOptimizations(optimizedRequest)
      }

      // Add to batch queue or process immediately
      if (this.config.batching.enabled && this.shouldBatch(optimizedRequest)) {
        const result = await this.addToBatch(optimizedRequest)
        this.stats.batched++
        return result
      } else {
        const result = await this.processRequest(optimizedRequest)
        return result
      }

    } catch (error) {
      this.stats.failed++
      this.emit('request:error', { requestId, error })
      throw error
    }
  }

  /**
   * Submit multiple requests for batch processing
   */
  async submitBatch(requests: Omit<OptimizedRequest, 'id' | 'metadata'>[]): Promise<any[]> {
    if (!this.config.batching.enabled) {
      // Process individually if batching is disabled
      const promises = requests.map(req => this.submitRequest(req))
      return Promise.all(promises)
    }

    const optimizedRequests = requests.map(req => ({
      ...req,
      id: this.generateId(),
      originalId: req.originalId || this.generateId(),
      metadata: {
        estimatedTokens: this.estimateTokens(req.prompt),
        estimatedCost: this.estimateCost(req.provider, req.model, req.prompt)
      }
    }))

    this.stats.total += requests.length

    // Group requests by batch key
    const groups = this.groupRequestsForBatch(optimizedRequests)

    // Process each group
    const results: any[] = []
    for (const [batchKey, group] of groups) {
      if (group.length === 1) {
        // Process single requests
        const result = await this.processRequest(group[0])
        results.push(result)
      } else {
        // Process as batch
        const batchId = this.generateId()
        const batch: RequestBatch = {
          id: batchId,
          requests: group,
          provider: group[0].provider,
          model: group[0].model,
          createdAt: Date.now(),
          maxWaitTime: this.config.batching.maxWaitTime,
          status: 'pending'
        }

        const result = await this.processBatch(batch)
        results.push(...result)
      }
    }

    return results
  }

  /**
   * Get current request statistics
   */
  getStats(): RequestStats {
    return {
      ...this.stats,
      deduplicationRate: this.stats.total > 0 ? (this.stats.deduplicated / this.stats.total) * 100 : 0,
      batchEfficiency: this.stats.batched > 0 ? (this.stats.batched / Math.ceil(this.stats.batched / this.config.batching.maxBatchSize)) * 100 : 0
    }
  }

  /**
   * Get current batch status
   */
  getBatchStatus(): {
    pendingBatches: number
    activeBatches: number
    queuedRequests: number
    averageBatchSize: number
  } {
    const pendingBatches = this.batchQueues.size
    const activeBatches = this.activeBatches.size
    const queuedRequests = Array.from(this.batchQueues.values()).reduce((sum, queue) => sum + queue.length, 0)
    const averageBatchSize = activeBatches > 0
      ? Array.from(this.activeBatches.values()).reduce((sum, batch) => sum + batch.requests.length, 0) / activeBatches
      : 0

    return {
      pendingBatches,
      activeBatches,
      queuedRequests,
      averageBatchSize
    }
  }

  /**
   * Force process all pending batches
   */
  async flushBatches(): Promise<void> {
    const batchPromises: Promise<void>[] = []

    for (const [batchKey, queue] of this.batchQueues) {
      if (queue.length > 0) {
        const batch = this.createBatch(batchKey, queue)
        batchQueues.set(batchKey, [])
        batchPromises.push(this.processBatch(batch))
      }
    }

    await Promise.all(batchPromises)
    this.emit('batches:flushed')
  }

  /**
   * Cancel pending requests
   */
  cancelPendingRequests(filter?: { userId?: string; projectId?: string; provider?: string }): number {
    let cancelledCount = 0

    for (const [requestId, request] of this.pendingRequests) {
      let shouldCancel = !filter

      if (filter) {
        if (filter.userId && request.userId === filter.userId) shouldCancel = true
        if (filter.projectId && request.projectId === filter.projectId) shouldCancel = true
        if (filter.provider && request.provider === filter.provider) shouldCancel = true
      }

      if (shouldCancel) {
        this.pendingRequests.delete(requestId)
        cancelledCount++
      }
    }

    this.emit('requests:cancelled', { count: cancelledCount, filter })
    return cancelledCount
  }

  /**
   * Clear all caches and reset state
   */
  reset(): void {
    this.pendingRequests.clear()
    this.duplicateRequests.clear()
    this.batchQueues.clear()
    this.activeBatches.clear()
    this.processingBatches.clear()
    this.throttleTokens.clear()
    this.stats = this.initializeStats()
    this.emit('optimizer:reset')
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.reset()
    this.removeAllListeners()
  }

  // Private methods

  private initializeStats(): RequestStats {
    return {
      total: 0,
      deduplicated: 0,
      batched: 0,
      optimized: 0,
      failed: 0,
      averageLatency: 0,
      costSavings: 0,
      batchEfficiency: 0,
      deduplicationRate: 0
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateDeduplicationKey(request: OptimizedRequest): string {
    const keyData = `${request.provider}:${request.model}:${request.prompt}:${JSON.stringify(request.options)}`
    return createHash('sha256').update(keyData).digest('hex').substring(0, 16)
  }

  private generateBatchKey(request: OptimizedRequest): string {
    switch (this.config.batching.groupingStrategy) {
      case 'provider':
        return request.provider
      case 'model':
        return `${request.provider}:${request.model}`
      case 'user':
        return request.userId || 'anonymous'
      case 'project':
        return request.projectId || 'default'
      default:
        return request.provider
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private estimateCost(provider: string, model: string, prompt: string): number {
    // Simple cost estimation - would be based on actual pricing
    const tokens = this.estimateTokens(prompt)
    const baseCost = tokens * 0.00001 // $0.01 per 1K tokens
    return baseCost
  }

  private async checkThrottle(request: OptimizedRequest): Promise<void> {
    const key = `${request.provider}:${request.userId || 'anonymous'}`
    const now = Date.now()
    const tokens = this.throttleTokens.get(key) || 0

    // Simple token bucket implementation
    const maxTokens = this.config.throttling.burstCapacity
    const refillRate = this.config.throttling.requestsPerSecond / 1000 // tokens per ms

    // Refill tokens
    const elapsed = now - (tokens || now)
    const newTokens = Math.min(maxTokens, tokens + elapsed * refillRate)
    this.throttleTokens.set(key, newTokens)

    if (newTokens < 1) {
      const waitTime = (1 - newTokens) / refillRate
      this.emit('request:throttled', { requestId: request.id, waitTime })
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.throttleTokens.set(key, newTokens - 1)
  }

  private async applyOptimizations(request: OptimizedRequest): Promise<void> {
    if (this.config.optimization.mergeSimilarRequests) {
      // Look for similar requests to merge
      for (const [key, queue] of this.batchQueues) {
        const similarIndex = queue.findIndex(req => this.areRequestsSimilar(request, req))
        if (similarIndex !== -1) {
          // Merge with similar request
          const similarRequest = queue[similarIndex]
          request.prompt = this.mergePrompts(request.prompt, similarRequest.prompt)
          queue.splice(similarIndex, 1)
          this.stats.optimized++
          this.emit('request:merged', { requestId: request.id, mergedWith: similarRequest.id })
          break
        }
      }
    }

    if (this.config.optimization.prioritizeByCost) {
      // Adjust priority based on cost
      if (request.metadata.estimatedCost > 0.1) {
        request.priority = 'high'
      }
    }
  }

  private shouldBatch(request: OptimizedRequest): boolean {
    // Don't batch high-priority or urgent requests
    if (request.priority === 'urgent' || request.priority === 'high') {
      return false
    }

    // Don't batch if the batch would be too small
    const batchKey = this.generateBatchKey(request)
    const queue = this.batchQueues.get(batchKey) || []
    return queue.length > 0 || this.config.batching.maxBatchSize > 1
  }

  private async addToBatch(request: OptimizedRequest): Promise<any> {
    const batchKey = this.generateBatchKey(request)

    if (!this.batchQueues.has(batchKey)) {
      this.batchQueues.set(batchKey, [])
    }

    const queue = this.batchQueues.get(batchKey)!
    queue.push(request)

    // Create promise that resolves when batch is processed
    const batchPromise = new Promise((resolve, reject) => {
      request.resolve = resolve
      request.reject = reject
    })

    // Check if we should process the batch now
    if (queue.length >= this.config.batching.maxBatchSize) {
      await this.processBatchQueue(batchKey)
    } else {
      // Set timer to process batch if not already set
      this.scheduleBatchProcessing(batchKey)
    }

    return batchPromise
  }

  private async processRequest(request: OptimizedRequest): Promise<any> {
    const startTime = Date.now()

    try {
      // Add to deduplication map
      if (this.config.deduplication.enabled) {
        const deduplicationKey = this.generateDeduplicationKey(request)
        const promise = new Promise((resolve, reject) => {
          request.resolve = resolve
          request.reject = reject
        })

        this.duplicateRequests.set(deduplicationKey, {
          requestId: request.id,
          promise,
          timestamp: Date.now(),
          requestCount: 1
        })

        // Clean up deduplication entry after window
        setTimeout(() => {
          this.duplicateRequests.delete(deduplicationKey)
        }, this.config.deduplication.windowSize)
      }

      this.emit('request:processing', request)

      // In a real implementation, this would call the actual AI service
      const result = await this.executeRequest(request)

      const latency = Date.now() - startTime
      this.updateLatencyStats(latency)

      if (request.resolve) {
        request.resolve(result)
      }

      this.emit('request:completed', { requestId: request.id, latency, result })
      return result

    } catch (error) {
      if (request.reject) {
        request.reject(error)
      }
      this.emit('request:error', { requestId: request.id, error })
      throw error
    }
  }

  private async executeRequest(request: OptimizedRequest): Promise<any> {
    // Placeholder for actual request execution
    // In a real implementation, this would call the AI service
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    return {
      id: request.id,
      content: `Mock response for: ${request.prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: request.metadata.estimatedTokens,
        completionTokens: Math.floor(request.metadata.estimatedTokens * 0.3),
        totalTokens: Math.floor(request.metadata.estimatedTokens * 1.3)
      },
      model: request.model,
      provider: request.provider
    }
  }

  private async processBatch(batch: RequestBatch): Promise<any[]> {
    this.activeBatches.set(batch.id, batch)
    this.processingBatches.add(batch.id)

    try {
      this.emit('batch:processing', batch)

      // Combine prompts for batch processing
      const combinedPrompt = this.combineBatchPrompts(batch.requests)

      // Execute batch request
      const batchResult = await this.executeBatchRequest(batch, combinedPrompt)

      // Split results back to individual requests
      const results = this.splitBatchResults(batchResult, batch.requests)

      // Resolve individual request promises
      batch.requests.forEach((request, index) => {
        if (request.resolve) {
          request.resolve(results[index])
        }
      })

      batch.status = 'completed'
      batch.result = batchResult

      this.emit('batch:completed', { batchId: batch.id, results })

      return results

    } catch (error) {
      batch.status = 'failed'
      batch.error = error as Error

      // Reject individual request promises
      batch.requests.forEach(request => {
        if (request.reject) {
          request.reject(error)
        }
      })

      this.emit('batch:error', { batchId: batch.id, error })
      throw error

    } finally {
      this.activeBatches.delete(batch.id)
      this.processingBatches.delete(batch.id)
    }
  }

  private async processBatchQueue(batchKey: string): Promise<void> {
    const queue = this.batchQueues.get(batchKey)
    if (!queue || queue.length === 0) return

    const batch = this.createBatch(batchKey, queue)
    this.batchQueues.set(batchKey, [])

    await this.processBatch(batch)
  }

  private createBatch(batchKey: string, requests: OptimizedRequest[]): RequestBatch {
    const batchId = this.generateId()
    return {
      id: batchId,
      requests: [...requests],
      provider: requests[0].provider,
      model: requests[0].model,
      createdAt: Date.now(),
      maxWaitTime: this.config.batching.maxWaitTime,
      status: 'pending'
    }
  }

  private groupRequestsForBatch(requests: OptimizedRequest[]): Map<string, OptimizedRequest[]> {
    const groups = new Map<string, OptimizedRequest[]>()

    for (const request of requests) {
      const batchKey = this.generateBatchKey(request)

      if (!groups.has(batchKey)) {
        groups.set(batchKey, [])
      }

      groups.get(batchKey)!.push(request)
    }

    return groups
  }

  private areRequestsSimilar(req1: OptimizedRequest, req2: OptimizedRequest): boolean {
    // Simple similarity check - in production would use semantic similarity
    return req1.provider === req2.provider &&
           req1.model === req2.model &&
           Math.abs(req1.prompt.length - req2.prompt.length) < 100
  }

  private mergePrompts(prompt1: string, prompt2: string): string {
    return `${prompt1}\n\nAdditionally: ${prompt2}`
  }

  private combineBatchPrompts(requests: OptimizedRequest[]): string {
    return requests.map((req, index) => `Request ${index + 1}: ${req.prompt}`).join('\n\n---\n\n')
  }

  private async executeBatchRequest(batch: RequestBatch, combinedPrompt: string): Promise<any> {
    // Placeholder for batch execution
    // In a real implementation, would optimize for batch processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    return {
      id: batch.id,
      content: `Batch response for ${batch.requests.length} requests`,
      results: batch.requests.map((_, index) => ({
        index,
        content: `Response ${index + 1} for batch request`
      })),
      usage: {
        promptTokens: this.estimateTokens(combinedPrompt),
        completionTokens: Math.floor(this.estimateTokens(combinedPrompt) * 0.3),
        totalTokens: Math.floor(this.estimateTokens(combinedPrompt) * 1.3)
      }
    }
  }

  private splitBatchResults(batchResult: any, requests: OptimizedRequest[]): any[] {
    // Split batch results back to individual requests
    if (batchResult.results) {
      return batchResult.results
    }

    // Fallback: create individual results from batch result
    return requests.map((_, index) => ({
      id: this.generateId(),
      content: batchResult.content,
      usage: {
        ...batchResult.usage,
        promptTokens: Math.floor(batchResult.usage.promptTokens / requests.length),
        completionTokens: Math.floor(batchResult.usage.completionTokens / requests.length),
        totalTokens: Math.floor(batchResult.usage.totalTokens / requests.length)
      }
    }))
  }

  private scheduleBatchProcessing(batchKey: string): void {
    // Clear existing timer for this batch key
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    // Set new timer
    this.batchTimer = setTimeout(async () => {
      await this.processBatchQueue(batchKey)
    }, this.config.batching.maxWaitTime)
  }

  private updateLatencyStats(latency: number): void {
    this.stats.averageLatency = (this.stats.averageLatency + latency) / 2
  }

  private startTimers(): void {
    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries()
    }, 60000) // Run every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    const windowSize = this.config.deduplication.windowSize

    // Clean up expired deduplication entries
    for (const [key, entry] of this.duplicateRequests) {
      if (now - entry.timestamp > windowSize) {
        this.duplicateRequests.delete(key)
      }
    }

    // Clean up expired throttle tokens
    for (const [key, tokens] of this.throttleTokens) {
      if (tokens < this.config.throttling.burstCapacity) {
        // Refill tokens
        this.throttleTokens.set(key, this.config.throttling.burstCapacity)
      }
    }

    this.emit('cleanup:completed')
  }
}

// Extend OptimizedRequest interface
declare module './requestOptimizer' {
  interface OptimizedRequest {
    resolve?: (value: any) => void
    reject?: (error: any) => void
  }
}

// Factory function
export function createRequestOptimizer(config?: Partial<RequestConfig>): RequestOptimizer {
  return new RequestOptimizer(config)
}