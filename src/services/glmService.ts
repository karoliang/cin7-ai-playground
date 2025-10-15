import {
  GLMConfig,
  GLMMessage,
  GLMChatCompletionRequest,
  GLMChatCompletionResponse,
  GLMStreamChunk,
  GLMModel,
  GLMServiceOptions,
  GLMCodeGenerationRequest,
  GLMCodeGenerationResponse,
  GLMContextualUpdateRequest,
  GLMContextualUpdateResponse,
  GLMServiceHealth,
  GLMRequestMetrics,
  GLMError,
  DEFAULT_GLM_CONFIG,
  DEFAULT_GLM_SERVICE_OPTIONS,
  GLMProviderConfig
} from '@/types/glm'
import { GenerateRequest, GenerateResponse, ProjectFile, FileOperation } from '@/types'

// Import the zhipu-sdk-js
import ZhipuAI from 'zhipu-sdk-js'
import { EnvironmentAPIKeyManager } from '@/security/apiKeyManager'

export class GLMService {
  private config: GLMConfig
  private options: GLMServiceOptions
  private client: ZhipuAI
  private requestMetrics: GLMRequestMetrics[] = []
  private healthStatus: GLMServiceHealth
  private apiKeyManager: EnvironmentAPIKeyManager

  constructor(config: GLMConfig, options: GLMServiceOptions = {}) {
    this.config = { ...DEFAULT_GLM_CONFIG, ...config }
    this.options = { ...DEFAULT_GLM_SERVICE_OPTIONS, ...options }

    // SECURITY: Use secure API key management
    try {
      this.apiKeyManager = EnvironmentAPIKeyManager.getInstance()
    } catch (error) {
      throw new Error('Failed to initialize secure API key manager')
    }

    // Get API key securely
    const secureApiKey = this.getSecureAPIKey()
    if (!secureApiKey) {
      throw new Error('GLM API key not found or invalid')
    }

    this.client = new ZhipuAI({
      apiKey: secureApiKey
    })

    this.healthStatus = {
      status: 'healthy',
      last_check: Date.now(),
      error_rate: 0
    }

    this.log('GLM Service initialized', { config: { ...this.config, apiKey: '***' } })
  }

  /**
   * Get API key securely from the key manager
   */
  private getSecureAPIKey(): string | null {
    try {
      return this.apiKeyManager.getAPIKey('glm')
    } catch (error) {
      this.logError('Failed to get secure API key', error)
      return null
    }
  }

  /**
   * Refresh API key if needed
   */
  private refreshAPIKey(): boolean {
    try {
      const newApiKey = this.getSecureAPIKey()
      if (newApiKey) {
        this.client = new ZhipuAI({ apiKey: newApiKey })
        this.log('API key refreshed successfully')
        return true
      }
    } catch (error) {
      this.logError('Failed to refresh API key', error)
    }
    return false
  }

  /**
   * Generate code using GLM model
   */
  async generateCode(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      this.log('Starting code generation', { requestId, prompt: request.prompt.substring(0, 100) })

      // Convert the GenerateRequest to GLM format
      const glmRequest = this.convertToGLMRequest(request)

      const response = await this.client.createCompletions(glmRequest)

      const endTime = Date.now()
      const latency = endTime - startTime

      // Record metrics
      this.recordMetrics({
        request_id: requestId,
        timestamp: startTime,
        model: glmRequest.model,
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
        latency_ms: latency,
        success: true
      })

      // Convert GLM response to GenerateResponse
      const result = this.convertGLMResponseToGenerateResponse(response)

      this.log('Code generation completed', { requestId, latency, files: result.files.length })

      return result

    } catch (error) {
      const endTime = Date.now()
      const latency = endTime - startTime

      this.recordMetrics({
        request_id: requestId,
        timestamp: startTime,
        model: 'glm-4',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: latency,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      this.logError('Code generation failed', { requestId, error })

      return {
        success: false,
        files: [],
        operations: [],
        error: this.formatError(error)
      }
    }
  }

  /**
   * Process contextual update using GLM
   */
  async processContextualUpdate(
    context: any,
    files: ProjectFile[],
    messages: any[]
  ): Promise<any> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      this.log('Starting contextual update', { requestId, fileCount: files.length })

      const systemPrompt = this.buildContextualUpdatePrompt(context, files)
      const userPrompt = messages[messages.length - 1]?.content || 'Update the code based on the context'

      const glmRequest: any = {
        model: 'glm-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: {
          type: 'json_object'
        }
      }

      const response = await this.client.createCompletions(glmRequest)

      const endTime = Date.now()
      const latency = endTime - startTime

      this.recordMetrics({
        request_id: requestId,
        timestamp: startTime,
        model: glmRequest.model,
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
        latency_ms: latency,
        success: true
      })

      // Parse the response for contextual update
      const result = this.parseContextualUpdateResponse(response.choices[0]?.message?.content || '{}')

      this.log('Contextual update completed', { requestId, latency })

      return result

    } catch (error) {
      this.logError('Contextual update failed', { requestId, error })

      return {
        success: false,
        error: this.formatError(error)
      }
    }
  }

  /**
   * Stream code generation
   */
  async *generateCodeStream(request: GenerateRequest): AsyncGenerator<string, void, unknown> {
    const requestId = this.generateRequestId()

    try {
      this.log('Starting streaming code generation', { requestId })

      const glmRequest: any = {
        ...this.convertToGLMRequest(request),
        stream: true
      }

      const stream = await this.client.createCompletions(glmRequest)

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }

      this.log('Streaming code generation completed', { requestId })

    } catch (error) {
      this.logError('Streaming code generation failed', { requestId, error })
      throw error
    }
  }

  /**
   * Test connection to GLM API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.createCompletions({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: 'Test connection' }],
        maxTokens: 10
      })

      this.healthStatus = {
        status: 'healthy',
        last_check: Date.now(),
        error_rate: 0
      }

      return true

    } catch (error) {
      this.healthStatus = {
        status: 'unhealthy',
        last_check: Date.now(),
        error_rate: 100,
        error_message: this.formatError(error)
      }

      return false
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): GLMServiceHealth {
    return { ...this.healthStatus }
  }

  /**
   * Get request metrics
   */
  getRequestMetrics(): GLMRequestMetrics[] {
    return [...this.requestMetrics]
  }

  /**
   * Clear request metrics
   */
  clearMetrics(): void {
    this.requestMetrics = []
  }

  // Private methods

  private convertToGLMRequest(request: GenerateRequest): any {
    const messages: any[] = []

    // Add system prompt
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(request)
    })

    // Add chat history
    if (request.chat_history) {
      for (const msg of request.chat_history) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: this.buildUserPrompt(request)
    })

    return {
      model: 'glm-4',
      messages,
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.max_tokens || 4000,
      response_format: {
        type: 'json_object'
      }
    }
  }

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
- Ensuring the code works within the CIN7 AI Playground architecture

Current framework: ${request.context?.framework || 'React'}
Template: ${request.context?.template || 'Custom'}
Architecture: ${request.context?.architecture?.type || 'multi-page'}`
  }

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

    if (request.context?.examples && request.context.examples.length > 0) {
      prompt += '\n\nExamples to follow:\n'
      request.context.examples.forEach(example => {
        prompt += `- ${example.description} (${example.language}):\n\`\`\`${example.language}\n${example.code}\n\`\`\`\n`
      })
    }

    return prompt
  }

  private buildContextualUpdatePrompt(context: any, files: ProjectFile[]): string {
    return `You are helping with contextual updates to a CIN7 AI Playground project.

Current project context:
${JSON.stringify(context, null, 2)}

Existing files:
${files.map(f => `- ${f.name} (${f.type}): ${f.content.substring(0, 200)}...`).join('\n')}

Your task is to analyze the update request and provide targeted changes. Always respond with a JSON object containing:
{
  "success": true,
  "files": [{"name": "...", "content": "...", "type": "..."}],
  "operations": [{"type": "...", "file": "...", "content": "...", "reason": "..."}],
  "explanation": "Explanation of changes",
  "confidence": 0.95
}

Focus on minimal, targeted changes that preserve existing functionality.`
  }

  private convertGLMResponseToGenerateResponse(
    response: GLMChatCompletionResponse
  ): GenerateResponse {
    try {
      const content = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)

      return {
        success: true,
        files: parsed.files || [],
        operations: parsed.operations || [],
        reasoning: parsed.explanation,
        confidence: parsed.confidence,
        next_steps: parsed.next_steps,
        warnings: parsed.warnings
      }

    } catch (error) {
      this.logError('Failed to parse GLM response', { error, content: response.choices[0]?.message?.content })

      // Fallback: create a simple response
      return {
        success: true,
        files: [{
          id: this.generateId(),
          name: 'generated.tsx',
          type: 'tsx',
          content: response.choices[0]?.message?.content || '// Generated content',
          language: 'typescript'
        }],
        operations: [{
          type: 'create',
          file: 'generated.tsx',
          content: response.choices[0]?.message?.content || '// Generated content',
          reason: 'Fallback generation due to parsing error'
        }],
        reasoning: 'Code generated with fallback parsing'
      }
    }
  }

  private parseContextualUpdateResponse(content: string): any {
    try {
      return JSON.parse(content)
    } catch (error) {
      this.logError('Failed to parse contextual update response', { error, content })

      return {
        success: false,
        error: 'Failed to parse AI response'
      }
    }
  }

  private formatError(error: any): string {
    if (error instanceof Error) {
      return error.message
    }

    if (error?.error?.message) {
      return error.error.message
    }

    return String(error)
  }

  private generateRequestId(): string {
    return `glm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private recordMetrics(metrics: GLMRequestMetrics): void {
    this.requestMetrics.push(metrics)

    // Keep only last 1000 metrics
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000)
    }

    // Update health status based on recent metrics
    this.updateHealthStatus()
  }

  private updateHealthStatus(): void {
    const recentMetrics = this.requestMetrics.slice(-100)
    const errorCount = recentMetrics.filter(m => !m.success).length
    const errorRate = (errorCount / recentMetrics.length) * 100

    this.healthStatus = {
      status: errorRate > 50 ? 'unhealthy' : errorRate > 20 ? 'degraded' : 'healthy',
      last_check: Date.now(),
      error_rate: errorRate,
      latency_ms: recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.latency_ms, 0) / recentMetrics.length
        : undefined
    }
  }

  private log(message: string, data?: any): void {
    if (this.options.enableLogging) {
      console.log(`[GLM Service] ${message}`, data || '')
    }
  }

  private logError(message: string, data?: any): void {
    if (this.options.enableLogging) {
      console.error(`[GLM Service Error] ${message}`, data || '')
    }
  }
}

// Singleton instance
let glmServiceInstance: GLMService | null = null

export function getGLMService(config?: GLMConfig, options?: GLMServiceOptions): GLMService {
  if (!glmServiceInstance && config) {
    glmServiceInstance = new GLMService(config, options)
  }

  if (!glmServiceInstance) {
    throw new Error('GLM Service not initialized. Call getGLMService with config first.')
  }

  return glmServiceInstance
}

export function initializeGLMService(config: GLMConfig, options?: GLMServiceOptions): GLMService {
  glmServiceInstance = new GLMService(config, options)
  return glmServiceInstance
}

export function isGLMServiceInitialized(): boolean {
  return glmServiceInstance !== null
}

// Utility functions
export function validateGLMConfig(config: Partial<GLMConfig>): string[] {
  const errors: string[] = []

  if (!config.apiKey) {
    errors.push('API key is required')
  }

  if (config.apiKey && config.apiKey.length < 10) {
    errors.push('API key appears to be invalid')
  }

  if (config.timeout && config.timeout < 1000) {
    errors.push('Timeout should be at least 1000ms')
  }

  if (config.retryAttempts && config.retryAttempts > 10) {
    errors.push('Retry attempts should not exceed 10')
  }

  return errors
}

export function createGLMConfigFromEnv(): GLMConfig {
  const apiKey = (import.meta.env as any).VITE_GLM_API_KEY

  if (!apiKey) {
    throw new Error('VITE_GLM_API_KEY environment variable is required')
  }

  return {
    apiKey,
    baseURL: (import.meta.env as any).VITE_GLM_BASE_URL || DEFAULT_GLM_CONFIG.baseURL,
    timeout: parseInt((import.meta.env as any).VITE_GLM_TIMEOUT || '30000'),
    retryAttempts: parseInt((import.meta.env as any).VITE_GLM_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt((import.meta.env as any).VITE_GLM_RETRY_DELAY || '1000')
  }
}