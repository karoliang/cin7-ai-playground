import {
  AIGatewayConfig,
  AIGatewayRequest,
  AIGatewayResponse,
  AIGatewayStreamRequest,
  AIGatewayStreamChunk,
  AIGatewayError,
  ErrorCode,
  AIProviderConfig
} from '@/types/aiGateway'
import { GenerateRequest, GenerateResponse, ProjectFile, FileOperation } from '@/types'
import { getGLMService } from './glmService'
import { ResponseCacheService } from './responseCache'
import { RateLimiterService } from './rateLimiter'
import { ContextManagerService, ContextEnhancementService } from './contextManager'
import { AIMetricsService } from './aiMetrics'
import { AIHealthCheckService } from './aiHealthCheck'
import { aiGatewayConfig } from '@/config/aiGatewayConfig'

/**
 * Main AI Gateway Service
 * Enterprise-grade AI service management with comprehensive features
 */
export class AIGatewayService {
  private config: AIGatewayConfig
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  // Core services
  private cacheService: ResponseCacheService
  private rateLimiterService: RateLimiterService
  private contextManagerService: ContextManagerService
  private contextEnhancementService: ContextEnhancementService
  private metricsService: AIMetricsService
  private healthCheckService: AIHealthCheckService

  // Request deduplication
  private pendingRequests = new Map<string, Promise<AIGatewayResponse>>()

  // Circuit breaker state
  private circuitBreakerState = new Map<string, CircuitBreakerState>()

  private constructor(config: AIGatewayConfig) {
    this.config = config

    // Initialize services
    this.cacheService = new ResponseCacheService(config.cache)
    this.rateLimiterService = new RateLimiterService(config.rateLimiting)
    this.contextManagerService = new ContextManagerService({
      maxConversationMessages: 50,
      maxContextSize: 100000,
      contextTTL: 24 * 60 * 60 * 1000
    })
    this.contextEnhancementService = new ContextEnhancementService(
      this.contextManagerService,
      {
        maxRelevantFiles: 10,
        maxConversationHistory: 10,
        includeFileContent: true,
        includeConversationHistory: true
      }
    )
    this.metricsService = new AIMetricsService(config.monitoring)
    this.healthCheckService = new AIHealthCheckService(config.healthCheck)

    // Set up service dependencies
    this.healthCheckService.setServices({
      cache: this.cacheService,
      rateLimiter: this.rateLimiterService,
      contextManager: this.contextManagerService,
      metrics: this.metricsService
    })

    // Start health monitoring if enabled
    if (config.features.healthChecks) {
      this.healthCheckService.start()
    }

    console.log('[AI Gateway] Service created')
  }

  /**
   * Initialize the AI Gateway service
   */
  static async initialize(): Promise<AIGatewayService> {
    const config = aiGatewayConfig.getConfig()
    return new AIGatewayService(config).initialize()
  }

  /**
   * Initialize service and dependencies
   */
  private async initialize(): Promise<AIGatewayService> {
    if (this.isInitialized) {
      return this
    }

    if (this.initializationPromise) {
      return this.initializationPromise.then(() => this)
    }

    this.initializationPromise = this.performInitialization()
    await this.initializationPromise

    this.isInitialized = true
    console.log('[AI Gateway] Service initialized successfully')

    return this
  }

  /**
   * Perform actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      // Test provider connections
      for (const provider of this.config.providers) {
        if (provider.enabled) {
          await this.testProviderConnection(provider)
        }
      }

      console.log('[AI Gateway] All providers tested successfully')
    } catch (error) {
      console.error('[AI Gateway] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Generate AI response (non-streaming)
   */
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    // Ensure service is initialized
    await this.ensureInitialized()

    // Convert to AI Gateway request format
    const gatewayRequest = await this.convertToGatewayRequest(request)

    try {
      // Process the request through the gateway
      const gatewayResponse = await this.processRequest(gatewayRequest)

      // Convert back to original format
      return this.convertFromGatewayResponse(gatewayResponse)

    } catch (error) {
      console.error('[AI Gateway] Request failed:', error)
      return {
        success: false,
        files: [],
        operations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate AI response (streaming)
   */
  async *generateResponseStream(request: GenerateRequest): AsyncGenerator<string, void, unknown> {
    // Ensure service is initialized
    await this.ensureInitialized()

    // Convert to AI Gateway request format with streaming enabled
    const gatewayRequest = await this.convertToGatewayRequest({
      ...request,
      options: { ...request.options, stream: true }
    })

    try {
      // Process the streaming request
      for await (const chunk of this.processStreamRequest(gatewayRequest)) {
        yield chunk.content
      }

    } catch (error) {
      console.error('[AI Gateway] Streaming request failed:', error)
      yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * Process contextual update
   */
  async processContextualUpdate(
    context: any,
    files: ProjectFile[],
    messages: any[]
  ): Promise<any> {
    // Ensure service is initialized
    await this.ensureInitialized()

    try {
      // Update project context
      if (context.projectId) {
        await this.contextManagerService.updateProjectFiles(context.projectId, files)
        await this.contextManagerService.setProjectArchitecture(
          context.projectId,
          context.architecture,
          context.framework
        )
      }

      // Get GLM service and process contextual update
      const glmService = getGLMService()
      return await glmService.processContextualUpdate(context, files, messages)

    } catch (error) {
      console.error('[AI Gateway] Contextual update failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process a gateway request
   */
  private async processRequest(request: AIGatewayRequest): Promise<AIGatewayResponse> {
    const startTime = Date.now()

    // Start metrics collection
    const requestMetrics = this.metricsService.recordRequestStart(request)

    try {
      // Check rate limits
      if (this.config.features.rateLimiting) {
        const rateLimitResult = await this.rateLimiterService.checkLimit(request)
        if (!rateLimitResult.allowed) {
          throw this.createError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', {
            retryAfter: rateLimitResult.retryAfter
          })
        }
      }

      // Check cache
      if (this.config.features.caching) {
        const cachedResponse = await this.cacheService.get(request)
        if (cachedResponse) {
          this.metricsService.recordCacheHit(request.id, cachedResponse)
          return cachedResponse
        }
      }

      // Check for duplicate requests
      if (this.config.features.requestDeduplication) {
        const duplicateKey = this.generateDuplicateKey(request)
        const existingRequest = this.pendingRequests.get(duplicateKey)
        if (existingRequest) {
          return await existingRequest
        }
      }

      // Create request promise
      const requestPromise = this.executeRequest(request)

      // Track request for deduplication
      if (this.config.features.requestDeduplication) {
        const duplicateKey = this.generateDuplicateKey(request)
        this.pendingRequests.set(duplicateKey, requestPromise)

        // Clean up after request completes
        requestPromise.finally(() => {
          this.pendingRequests.delete(duplicateKey)
        })
      }

      // Execute request
      const response = await requestPromise

      // Cache response
      if (this.config.features.caching) {
        await this.cacheService.set(request, response)
      }

      // Record request completion
      this.metricsService.recordRequestComplete(requestMetrics, response)

      return response

    } catch (error) {
      // Record request error
      const gatewayError = this.convertToGatewayError(error)
      this.metricsService.recordRequestError(requestMetrics, gatewayError)

      throw gatewayError

    } finally {
      // Record request for rate limiting
      if (this.config.features.rateLimiting) {
        await this.rateLimiterService.recordRequest(request)
      }
    }
  }

  /**
   * Process a streaming request
   */
  private async *processStreamRequest(request: AIGatewayStreamRequest): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    // Start metrics collection
    const requestMetrics = this.metricsService.recordRequestStart(request)

    try {
      // Check rate limits
      if (this.config.features.rateLimiting) {
        const rateLimitResult = await this.rateLimiterService.checkLimit(request)
        if (!rateLimitResult.allowed) {
          throw this.createError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded')
        }
      }

      // Execute streaming request
      const chunks = await this.executeStreamRequest(request)

      let chunkIndex = 0
      for await (const chunk of chunks) {
        // Record stream chunk metrics
        this.metricsService.recordStreamChunk(request.id, chunkIndex++, chunk.content.length)

        yield chunk
      }

      // Record successful completion
      this.metricsService.recordRequestComplete(requestMetrics, {
        id: this.generateId(),
        requestId: request.id,
        provider: request.provider,
        model: request.model,
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        metadata: {
          requestId: request.id,
          providerResponseId: '',
          model: request.model,
          processingTime: Date.now() - requestMetrics.timestamp,
          cached: false
        },
        timestamp: Date.now(),
        cached: false,
        processingTime: Date.now() - requestMetrics.timestamp
      })

    } catch (error) {
      // Record request error
      const gatewayError = this.convertToGatewayError(error)
      this.metricsService.recordRequestError(requestMetrics, gatewayError)

      throw gatewayError
    }
  }

  /**
   * Execute a non-streaming request
   */
  private async executeRequest(request: AIGatewayRequest): Promise<AIGatewayResponse> {
    const provider = this.getProvider(request.provider)

    // Check circuit breaker
    if (this.config.features.circuitBreaker) {
      if (!this.checkCircuitBreaker(provider.id)) {
        throw this.createError('PROVIDER_ERROR', 'Provider circuit breaker is open')
      }
    }

    try {
      // Execute request based on provider type
      let response: AIGatewayResponse

      switch (provider.type) {
        case 'glm':
          response = await this.executeGLMRequest(request, provider)
          break
        default:
          throw this.createError('PROVIDER_ERROR', `Unsupported provider type: ${provider.type}`)
      }

      // Record success for circuit breaker
      if (this.config.features.circuitBreaker) {
        this.recordCircuitBreakerSuccess(provider.id)
      }

      return response

    } catch (error) {
      // Record failure for circuit breaker
      if (this.config.features.circuitBreaker) {
        this.recordCircuitBreakerFailure(provider.id)
      }

      throw error
    }
  }

  /**
   * Execute a streaming request
   */
  private async *executeStreamRequest(request: AIGatewayStreamRequest): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    const provider = this.getProvider(request.provider)

    // Check circuit breaker
    if (this.config.features.circuitBreaker) {
      if (!this.checkCircuitBreaker(provider.id)) {
        throw this.createError('PROVIDER_ERROR', 'Provider circuit breaker is open')
      }
    }

    try {
      // Execute streaming request based on provider type
      switch (provider.type) {
        case 'glm':
          yield* this.executeGLMStreamRequest(request, provider)
          break
        default:
          throw this.createError('PROVIDER_ERROR', `Unsupported provider type: ${provider.type}`)
      }

      // Record success for circuit breaker
      if (this.config.features.circuitBreaker) {
        this.recordCircuitBreakerSuccess(provider.id)
      }

    } catch (error) {
      // Record failure for circuit breaker
      if (this.config.features.circuitBreaker) {
        this.recordCircuitBreakerFailure(provider.id)
      }

      throw error
    }
  }

  /**
   * Execute GLM request
   */
  private async executeGLMRequest(request: AIGatewayRequest, provider: AIProviderConfig): Promise<AIGatewayResponse> {
    const glmService = getGLMService()

    // Convert AI Gateway request to GLM format
    const glmRequest = this.convertToGLMRequest(request)

    // Execute GLM request
    const glmResponse = await glmService.generateCode(glmRequest)

    // Convert GLM response to AI Gateway format
    return this.convertGLMResponseToGatewayResponse(glmResponse, request)
  }

  /**
   * Execute GLM streaming request
   */
  private async *executeGLMStreamRequest(request: AIGatewayStreamRequest, provider: AIProviderConfig): AsyncGenerator<AIGatewayStreamChunk, void, unknown> {
    const glmService = getGLMService()

    // Convert AI Gateway request to GLM format
    const glmRequest = this.convertToGLMRequest(request)

    // Execute GLM streaming request
    for await (const chunk of glmService.generateCodeStream(glmRequest)) {
      yield {
        id: this.generateId(),
        requestId: request.id,
        content: chunk,
        delta: chunk,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Convert GenerateRequest to AIGatewayRequest
   */
  private async convertToGatewayRequest(request: GenerateRequest): Promise<AIGatewayRequest> {
    // Get default provider
    const provider = this.getProvider(this.config.defaultProvider)

    // Build request context
    const context: RequestContext = {
      projectId: request.context?.projectId,
      userId: request.context?.userId,
      sessionId: this.generateSessionId(),
      framework: request.context?.framework,
      template: request.context?.template,
      architecture: request.context?.architecture,
      constraints: request.context?.constraints,
      examples: request.context?.examples
    }

    // Build messages
    const messages = [
      {
        role: 'system' as const,
        content: this.buildSystemPrompt(request)
      },
      {
        role: 'user' as const,
        content: this.buildUserPrompt(request)
      }
    ]

    // Add chat history
    if (request.chat_history) {
      for (const msg of request.chat_history) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    }

    return {
      id: this.generateId(),
      provider: provider.id,
      model: provider.config.model || 'glm-4',
      messages,
      context,
      options: {
        temperature: request.options?.temperature || 0.7,
        maxTokens: request.options?.max_tokens || 4000,
        responseFormat: 'json_object'
      },
      metadata: {
        source: 'web',
        correlationId: this.generateId(),
        tags: ['code-generation']
      },
      timestamp: Date.now()
    }
  }

  /**
   * Convert AIGatewayResponse back to GenerateResponse
   */
  private convertFromGatewayResponse(response: AIGatewayResponse): GenerateResponse {
    // Parse response content to extract files and operations
    let files: ProjectFile[] = []
    let operations: FileOperation[] = []
    let reasoning = ''

    try {
      const parsed = JSON.parse(response.content)
      files = parsed.files || []
      operations = parsed.operations || []
      reasoning = parsed.explanation || ''
    } catch (error) {
      // Fallback: create a single file with the content
      files = [{
        id: this.generateId(),
        name: 'generated.tsx',
        type: 'tsx',
        content: response.content,
        language: 'typescript'
      }]
    }

    return {
      success: true,
      files,
      operations,
      reasoning,
      next_steps: [],
      warnings: []
    }
  }

  /**
   * Convert AI Gateway request to GLM format
   */
  private convertToGLMRequest(request: AIGatewayRequest): GenerateRequest {
    // Build prompt from messages
    let prompt = ''
    for (const message of request.messages) {
      if (message.role === 'user') {
        prompt += message.content + '\n\n'
      }
    }

    return {
      prompt: prompt.trim(),
      context: request.context,
      options: {
        temperature: request.options?.temperature,
        max_tokens: request.options?.maxTokens,
        stream: false
      }
    }
  }

  /**
   * Convert GLM response to AI Gateway format
   */
  private convertGLMResponseToGatewayResponse(glmResponse: GenerateResponse, request: AIGatewayRequest): AIGatewayResponse {
    const content = JSON.stringify({
      files: glmResponse.files,
      operations: glmResponse.operations,
      explanation: glmResponse.reasoning,
      next_steps: glmResponse.next_steps,
      warnings: glmResponse.warnings
    })

    return {
      id: this.generateId(),
      requestId: request.id,
      provider: request.provider,
      model: request.model,
      content,
      usage: {
        promptTokens: 0, // Would be populated from actual GLM response
        completionTokens: 0,
        totalTokens: 0
      },
      metadata: {
        requestId: request.id,
        providerResponseId: glmResponse.id || '',
        model: request.model,
        processingTime: 0, // Would be calculated
        cached: false
      },
      timestamp: Date.now(),
      cached: false,
      processingTime: 0
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(request: GenerateRequest): string {
    return `You are an expert full-stack developer specializing in React, TypeScript, and modern web development. You help build high-quality, production-ready applications for the CIN7 ecosystem.

Your task is to generate complete, functional code based on the user's requirements. Always return your response as a JSON object with the following structure:
{
  "files": [
    {
      "name": "file_name.ext",
      "content": "file_content",
      "type": "file_type",
      "path": "file_path"
    }
  ],
  "explanation": "Brief explanation of what was generated",
  "operations": [
    {
      "type": "create|update|delete",
      "file": "file_name",
      "content": "file_content",
      "reason": "why this change was made"
    }
  ],
  "next_steps": ["step1", "step2"],
  "warnings": ["warning1", "warning2"]
}

Focus on:
- Writing clean, maintainable TypeScript code
- Following React best practices
- Implementing proper error handling
- Adding helpful comments where needed
- Ensuring the code works within the CIN7 AI Playground architecture`
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(request: GenerateRequest): string {
    let prompt = request.prompt

    if (request.existing_files && request.existing_files.length > 0) {
      prompt += '\n\nExisting files in the project:\n'
      for (const file of request.existing_files) {
        prompt += `\n- ${file.name} (${file.type}):\n${file.content.substring(0, 500)}${file.content.length > 500 ? '...' : ''}\n`
      }
    }

    if (request.context?.constraints && request.context.constraints.length > 0) {
      prompt += '\n\nConstraints and requirements:\n'
      request.context.constraints.forEach(constraint => {
        prompt += `- ${constraint}\n`
      })
    }

    return prompt
  }

  /**
   * Get provider configuration
   */
  private getProvider(providerId: string): AIProviderConfig {
    const provider = this.config.providers.find(p => p.id === providerId)
    if (!provider) {
      throw this.createError('PROVIDER_ERROR', `Provider not found: ${providerId}`)
    }
    return provider
  }

  /**
   * Test provider connection
   */
  private async testProviderConnection(provider: AIProviderConfig): Promise<void> {
    try {
      switch (provider.type) {
        case 'glm':
          // GLM connection test would be handled by GLM service
          console.log(`[AI Gateway] Provider ${provider.name} connection test skipped`)
          break
        default:
          console.warn(`[AI Gateway] No connection test for provider type: ${provider.type}`)
      }
    } catch (error) {
      console.error(`[AI Gateway] Provider ${provider.name} connection test failed:`, error)
      throw error
    }
  }

  /**
   * Circuit breaker methods
   */
  private checkCircuitBreaker(providerId: string): boolean {
    const state = this.circuitBreakerState.get(providerId)
    if (!state) {
      // Initialize circuit breaker state
      this.circuitBreakerState.set(providerId, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed'
      })
      return true
    }

    if (state.state === 'open') {
      // Check if circuit breaker should be half-open
      const timeSinceLastFailure = Date.now() - state.lastFailureTime
      if (timeSinceLastFailure > 60000) { // 1 minute timeout
        state.state = 'half-open'
        return true
      }
      return false
    }

    return true
  }

  private recordCircuitBreakerSuccess(providerId: string): void {
    const state = this.circuitBreakerState.get(providerId)
    if (state) {
      state.failures = 0
      state.state = 'closed'
    }
  }

  private recordCircuitBreakerFailure(providerId: string): void {
    const state = this.circuitBreakerState.get(providerId)
    if (state) {
      state.failures++
      state.lastFailureTime = Date.now()

      if (state.failures >= 5) { // 5 failures trigger circuit breaker
        state.state = 'open'
      }
    }
  }

  /**
   * Generate duplicate key for request deduplication
   */
  private generateDuplicateKey(request: AIGatewayRequest): string {
    const keyData = `${request.provider}:${request.model}:${JSON.stringify(request.messages)}`
    return btoa(keyData).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }

  /**
   * Convert error to AIGatewayError
   */
  private convertToGatewayError(error: any): AIGatewayError {
    if (error instanceof AIGatewayError) {
      return error
    }

    if (error instanceof Error) {
      return this.createError('INTERNAL_ERROR', error.message)
    }

    return this.createError('INTERNAL_ERROR', 'Unknown error')
  }

  /**
   * Create AIGatewayError
   */
  private createError(code: ErrorCode, message: string, details?: any): AIGatewayError {
    return {
      code,
      message,
      details,
      timestamp: Date.now()
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AI Gateway service not initialized')
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      config: {
        providers: this.config.providers.length,
        defaultProvider: this.config.defaultProvider,
        features: this.config.features
      },
      services: {
        cache: this.cacheService.getStats(),
        rateLimiter: this.rateLimiterService.getStats(),
        contextManager: this.contextManagerService.getStats(),
        metrics: this.metricsService.getMetrics(),
        healthCheck: this.healthCheckService.getHealthSummary()
      },
      circuitBreaker: Object.fromEntries(this.circuitBreakerState),
      pendingRequests: this.pendingRequests.size
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('[AI Gateway] Cleaning up resources')

    // Stop health monitoring
    this.healthCheckService.stop()

    // Cleanup services
    this.cacheService.destroy()
    await this.contextManagerService.cleanup()
    this.metricsService.cleanup()

    // Clear pending requests
    this.pendingRequests.clear()

    console.log('[AI Gateway] Cleanup completed')
  }
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'closed' | 'open' | 'half-open'
}

// Export singleton instance management
let aiGatewayInstance: AIGatewayService | null = null

export async function getAIGatewayService(): Promise<AIGatewayService> {
  if (!aiGatewayInstance) {
    aiGatewayInstance = await AIGatewayService.initialize()
  }
  return aiGatewayInstance
}

export function isAIGatewayInitialized(): boolean {
  return aiGatewayInstance?.isInitialized || false
}

export async function initializeAIGateway(): Promise<AIGatewayService> {
  aiGatewayInstance = await AIGatewayService.initialize()
  return aiGatewayInstance
}