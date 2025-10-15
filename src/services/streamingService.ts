import {
  AIGatewayStreamRequest,
  AIGatewayStreamChunk,
  AIGatewayStreamResponse,
  AIGatewayResponse,
  AIGatewayError
} from '@/types/aiGateway'
import { EventEmitter } from 'events'

/**
 * AI Gateway Streaming Service
 * Handles streaming AI responses with backpressure, buffering, and error handling
 */
export class StreamingService extends EventEmitter {
  private activeStreams = new Map<string, ActiveStream>()
  private config: StreamingConfig
  private metrics: StreamingMetrics

  constructor(config: StreamingConfig) {
    super()
    this.config = config
    this.metrics = new StreamingMetrics()
  }

  /**
   * Create a new stream
   */
  async createStream(request: AIGatewayStreamRequest): Promise<StreamHandle> {
    const streamId = this.generateStreamId()

    const activeStream: ActiveStream = {
      id: streamId,
      request,
      startTime: Date.now(),
      status: 'initializing',
      chunks: [],
      buffer: [],
      error: null,
      controller: null
    }

    this.activeStreams.set(streamId, activeStream)
    this.metrics.recordStreamCreated()

    const streamHandle = new StreamHandle(streamId, this)

    // Initialize the stream
    try {
      await this.initializeStream(activeStream)
      return streamHandle
    } catch (error) {
      this.activeStreams.delete(streamId)
      throw error
    }
  }

  /**
   * Process streaming chunks
   */
  async *processStream(streamId: string): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    const stream = this.activeStreams.get(streamId)
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`)
    }

    if (stream.status !== 'active') {
      throw new Error(`Stream not active: ${streamId}`)
    }

    try {
      stream.status = 'streaming'

      // Process chunks from the underlying provider
      for await (const chunk of this.getProviderChunks(stream)) {
        if (stream.status === 'cancelled') {
          break
        }

        const processedChunk = await this.processChunk(stream, chunk)

        // Apply buffering
        if (this.config.buffering.enabled) {
          yield* this.processBufferedChunks(stream, processedChunk)
        } else {
          yield processedChunk
        }

        // Record metrics
        this.metrics.recordChunk(streamId, processedChunk)

        // Emit chunk event
        this.emit('chunk', streamId, processedChunk)
      }

      // Finalize stream
      stream.status = 'completed'
      this.metrics.recordStreamCompleted(streamId)
      this.emit('completed', streamId)

    } catch (error) {
      stream.error = error as Error
      stream.status = 'error'
      this.metrics.recordStreamError(streamId, error as Error)
      this.emit('error', streamId, error)
      throw error
    } finally {
      // Cleanup after delay
      setTimeout(() => {
        this.cleanupStream(streamId)
      }, this.config.streamRetentionTime)
    }
  }

  /**
   * Cancel a stream
   */
  async cancelStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId)
    if (!stream) {
      return
    }

    stream.status = 'cancelled'

    // Abort the underlying request if supported
    if (stream.controller) {
      stream.controller.abort()
    }

    this.metrics.recordStreamCancelled(streamId)
    this.emit('cancelled', streamId)

    // Cleanup immediately
    this.cleanupStream(streamId)
  }

  /**
   * Get stream status
   */
  getStreamStatus(streamId: string): StreamStatus | null {
    const stream = this.activeStreams.get(streamId)
    if (!stream) {
      return null
    }

    return {
      id: stream.id,
      status: stream.status,
      startTime: stream.startTime,
      chunkCount: stream.chunks.length,
      bufferSize: stream.buffer.length,
      error: stream.error?.message || null,
      duration: Date.now() - stream.startTime
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamStatus[] {
    return Array.from(this.activeStreams.values()).map(stream => ({
      id: stream.id,
      status: stream.status,
      startTime: stream.startTime,
      chunkCount: stream.chunks.length,
      bufferSize: stream.buffer.length,
      error: stream.error?.message || null,
      duration: Date.now() - stream.startTime
    }))
  }

  /**
   * Get streaming metrics
   */
  getMetrics(): StreamingMetricsData {
    return this.metrics.getMetrics()
  }

  /**
   * Cleanup old streams
   */
  cleanup(): void {
    const now = Date.now()
    const cutoff = now - this.config.streamRetentionTime

    for (const [streamId, stream] of this.activeStreams) {
      if (stream.startTime < cutoff && stream.status !== 'active') {
        this.cleanupStream(streamId)
      }
    }
  }

  /**
   * Initialize a stream
   */
  private async initializeStream(stream: ActiveStream): Promise<void> {
    // Create abort controller for cancellation
    stream.controller = new AbortController()

    // Initialize based on provider
    switch (stream.request.provider) {
      case 'glm':
        await this.initializeGLMStream(stream)
        break
      default:
        throw new Error(`Unsupported provider for streaming: ${stream.request.provider}`)
    }

    stream.status = 'active'
  }

  /**
   * Initialize GLM stream
   */
  private async initializeGLMStream(stream: ActiveStream): Promise<void> {
    // GLM stream initialization would be handled here
    // This is a placeholder for actual GLM streaming implementation
    stream.status = 'active'
  }

  /**
   * Get chunks from provider
   */
  private async *getProviderChunks(stream: ActiveStream): AsyncGenerator<any, void, unknown> {
    // This would be implemented based on the specific provider
    // For now, yield empty chunks as placeholder
    const chunkCount = 10
    for (let i = 0; i < chunkCount; i++) {
      yield {
        id: this.generateChunkId(),
        content: `Chunk ${i + 1} content`,
        delta: `Chunk ${i + 1} delta`,
        timestamp: Date.now()
      }

      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * Process a chunk
   */
  private async processChunk(stream: ActiveStream, chunk: any): Promise<AIGatewayStreamChunk> {
    const processedChunk: AIGatewayStreamChunk = {
      id: chunk.id || this.generateChunkId(),
      requestId: stream.request.id,
      content: chunk.content || '',
      delta: chunk.delta || '',
      timestamp: Date.now()
    }

    // Add to stream chunks
    stream.chunks.push(processedChunk)

    // Apply content filtering if enabled
    if (this.config.contentFiltering.enabled) {
      processedChunk.content = this.filterContent(processedChunk.content)
      processedChunk.delta = this.filterContent(processedChunk.delta)
    }

    return processedChunk
  }

  /**
   * Process buffered chunks
   */
  private async *processBufferedChunks(
    stream: ActiveStream,
    chunk: AIGatewayStreamChunk
  ): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    // Add chunk to buffer
    stream.buffer.push(chunk)

    // Check if buffer should be flushed
    const shouldFlush =
      stream.buffer.length >= this.config.buffering.maxChunks ||
      this.getBufferSize(stream.buffer) >= this.config.buffering.maxSize ||
      this.shouldFlushByTime(stream)

    if (shouldFlush) {
      // Flush buffer
      for (const bufferedChunk of stream.buffer) {
        yield bufferedChunk
      }
      stream.buffer = []
    }
  }

  /**
   * Filter content
   */
  private filterContent(content: string): string {
    if (!this.config.contentFiltering.enabled) {
      return content
    }

    // Apply content filtering rules
    let filtered = content

    // Remove or replace sensitive information
    if (this.config.contentFiltering.removeSensitiveData) {
      filtered = filtered.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD]')
      filtered = filtered.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    }

    // Apply profanity filter
    if (this.config.contentFiltering.profanityFilter) {
      // Simple profanity filtering - in practice, use a proper library
      const profanityList = ['damn', 'hell'] // Example list
      for (const word of profanityList) {
        filtered = filtered.replace(new RegExp(word, 'gi'), '***')
      }
    }

    return filtered
  }

  /**
   * Get buffer size in bytes
   */
  private getBufferSize(buffer: AIGatewayStreamChunk[]): number {
    return buffer.reduce((size, chunk) => {
      return size + chunk.content.length + chunk.delta.length
    }, 0)
  }

  /**
   * Check if buffer should be flushed by time
   */
  private shouldFlushByTime(stream: ActiveStream): boolean {
    if (stream.buffer.length === 0) {
      return false
    }

    const firstChunk = stream.buffer[0]
    const timeSinceFirstChunk = Date.now() - firstChunk.timestamp
    return timeSinceFirstChunk >= this.config.buffering.maxWaitTime
  }

  /**
   * Cleanup stream
   */
  private cleanupStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      if (stream.controller) {
        stream.controller.abort()
      }
      this.activeStreams.delete(streamId)
      this.emit('cleanup', streamId)
    }
  }

  /**
   * Generate stream ID
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate chunk ID
   */
  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Stream Handle
 * Provides a clean interface for managing a single stream
 */
export class StreamHandle {
  private streamId: string
  private streamingService: StreamingService
  private isConsumed = false

  constructor(streamId: string, streamingService: StreamingService) {
    this.streamId = streamId
    this.streamingService = streamingService
  }

  /**
   * Consume the stream
   */
  async *consume(): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    if (this.isConsumed) {
      throw new Error('Stream already consumed')
    }

    this.isConsumed = true
    try {
      yield* this.streamingService.processStream(this.streamId)
    } finally {
      this.isConsumed = false
    }
  }

  /**
   * Cancel the stream
   */
  async cancel(): Promise<void> {
    await this.streamingService.cancelStream(this.streamId)
  }

  /**
   * Get stream status
   */
  getStatus(): StreamStatus | null {
    return this.streamingService.getStreamStatus(this.streamId)
  }

  /**
   * Get stream ID
   */
  getId(): string {
    return this.streamId
  }
}

/**
 * Streaming Response Builder
 * Builds a complete response from streaming chunks
 */
export class StreamingResponseBuilder {
  private chunks: AIGatewayStreamChunk[] = []
  private startTime: number
  private complete = false

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Add a chunk to the response
   */
  addChunk(chunk: AIGatewayStreamChunk): void {
    if (this.complete) {
      throw new Error('Response already complete')
    }
    this.chunks.push(chunk)
  }

  /**
   * Mark response as complete
   */
  complete(): void {
    this.complete = true
  }

  /**
   * Build the complete response
   */
  build(): AIGatewayStreamResponse {
    if (!this.complete) {
      throw new Error('Response not complete')
    }

    const content = this.chunks.map(chunk => chunk.content).join('')
    const finalUsage = this.calculateFinalUsage()

    return {
      requestId: this.chunks[0]?.requestId || '',
      provider: this.extractProvider(),
      model: this.extractModel(),
      chunks: [...this.chunks],
      finalUsage,
      metadata: {
        requestId: this.chunks[0]?.requestId || '',
        providerResponseId: '',
        model: this.extractModel(),
        processingTime: Date.now() - this.startTime,
        cached: false,
        chunkCount: this.chunks.length
      }
    }
  }

  /**
   * Get current content
   */
  getCurrentContent(): string {
    return this.chunks.map(chunk => chunk.content).join('')
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunks.length
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return Date.now() - this.startTime
  }

  /**
   * Calculate final usage
   */
  private calculateFinalUsage(): any {
    // This would be calculated based on actual token usage from chunks
    return {
      promptTokens: 0,
      completionTokens: this.chunks.length * 10, // Rough estimate
      totalTokens: this.chunks.length * 10
    }
  }

  /**
   * Extract provider from chunks
   */
  private extractProvider(): string {
    // Would be extracted from chunk metadata
    return 'glm'
  }

  /**
   * Extract model from chunks
   */
  private extractModel(): string {
    // Would be extracted from chunk metadata
    return 'glm-4'
  }
}

/**
 * Types and Interfaces
 */
export interface StreamingConfig {
  buffering: {
    enabled: boolean
    maxChunks: number
    maxSize: number // bytes
    maxWaitTime: number // milliseconds
  }
  contentFiltering: {
    enabled: boolean
    removeSensitiveData: boolean
    profanityFilter: boolean
  }
  streamRetentionTime: number // milliseconds
  maxConcurrentStreams: number
  chunkTimeout: number // milliseconds
}

export interface ActiveStream {
  id: string
  request: AIGatewayStreamRequest
  startTime: number
  status: StreamStatusType
  chunks: AIGatewayStreamChunk[]
  buffer: AIGatewayStreamChunk[]
  error: Error | null
  controller: AbortController | null
}

export type StreamStatusType = 'initializing' | 'active' | 'streaming' | 'completed' | 'error' | 'cancelled'

export interface StreamStatus {
  id: string
  status: StreamStatusType
  startTime: number
  chunkCount: number
  bufferSize: number
  error: string | null
  duration: number
}

export interface StreamingMetricsData {
  totalStreams: number
  activeStreams: number
  completedStreams: number
  cancelledStreams: number
  errorStreams: number
  totalChunks: number
  averageChunksPerStream: number
  averageStreamDuration: number
}

/**
 * Streaming Metrics
 */
class StreamingMetrics {
  private metrics: StreamingMetricsData = {
    totalStreams: 0,
    activeStreams: 0,
    completedStreams: 0,
    cancelledStreams: 0,
    errorStreams: 0,
    totalChunks: 0,
    averageChunksPerStream: 0,
    averageStreamDuration: 0
  }

  private streamDurations: number[] = []

  recordStreamCreated(): void {
    this.metrics.totalStreams++
    this.metrics.activeStreams++
  }

  recordStreamCompleted(streamId: string): void {
    this.metrics.activeStreams--
    this.metrics.completedStreams++
  }

  recordStreamCancelled(streamId: string): void {
    this.metrics.activeStreams--
    this.metrics.cancelledStreams++
  }

  recordStreamError(streamId: string, error: Error): void {
    this.metrics.activeStreams--
    this.metrics.errorStreams++
  }

  recordChunk(streamId: string, chunk: AIGatewayStreamChunk): void {
    this.metrics.totalChunks++
  }

  getMetrics(): StreamingMetricsData {
    // Calculate derived metrics
    const completedStreams = this.metrics.completedStreams + this.metrics.errorStreams + this.metrics.cancelledStreams

    this.metrics.averageChunksPerStream = completedStreams > 0
      ? this.metrics.totalChunks / completedStreams
      : 0

    this.metrics.averageStreamDuration = this.streamDurations.length > 0
      ? this.streamDurations.reduce((sum, duration) => sum + duration, 0) / this.streamDurations.length
      : 0

    return { ...this.metrics }
  }
}

// Default configuration
export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  buffering: {
    enabled: true,
    maxChunks: 10,
    maxSize: 1024 * 1024, // 1MB
    maxWaitTime: 100 // 100ms
  },
  contentFiltering: {
    enabled: true,
    removeSensitiveData: true,
    profanityFilter: false
  },
  streamRetentionTime: 5 * 60 * 1000, // 5 minutes
  maxConcurrentStreams: 100,
  chunkTimeout: 30000 // 30 seconds
}

// Export factory function
export function createStreamingService(config: Partial<StreamingConfig> = {}): StreamingService {
  const finalConfig = { ...DEFAULT_STREAMING_CONFIG, ...config }
  return new StreamingService(finalConfig)
}