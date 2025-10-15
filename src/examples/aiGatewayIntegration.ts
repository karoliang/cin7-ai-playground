/**
 * AI Gateway Integration Example
 * Demonstrates how to integrate the new AI Gateway service with the existing CIN7 AI Playground
 */

import React from 'react'
import { getAIGatewayService, initializeAIGateway } from '@/services/aiGatewayService'
import { initializeAIGatewayConfig } from '@/config/aiGatewayConfig'
import { GenerateRequest, GenerateResponse } from '@/types'

/**
 * Initialize AI Gateway for the application
 */
export async function initializeAIGatewayForApp(): Promise<void> {
  try {
    // Initialize configuration
    await initializeAIGatewayConfig()

    // Initialize AI Gateway service
    await initializeAIGateway()

    console.log('✅ AI Gateway initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize AI Gateway:', error)
    throw error
  }
}

/**
 * Generate code using the new AI Gateway service
 */
export async function generateCodeWithGateway(request: GenerateRequest): Promise<GenerateResponse> {
  const gatewayService = await getAIGatewayService()

  try {
    console.log('🚀 Generating code with AI Gateway...')
    const response = await gatewayService.generateResponse(request)

    console.log(`✅ Code generation completed. Generated ${response.files.length} files`)
    return response
  } catch (error) {
    console.error('❌ Code generation failed:', error)
    throw error
  }
}

/**
 * Generate code with streaming support
 */
export async function generateCodeStreamWithGateway(
  request: GenerateRequest,
  onChunk: (chunk: string) => void
): Promise<GenerateResponse> {
  const gatewayService = await getAIGatewayService()

  try {
    console.log('🌊 Starting streaming code generation...')
    let fullContent = ''

    for await (const chunk of gatewayService.generateResponseStream(request)) {
      fullContent += chunk
      onChunk(chunk)
    }

    // Parse the complete response
    const response = parseStreamingResponse(fullContent)
    console.log(`✅ Streaming generation completed. Generated ${response.files.length} files`)

    return response
  } catch (error) {
    console.error('❌ Streaming code generation failed:', error)
    throw error
  }
}

/**
 * Process contextual update using AI Gateway
 */
export async function processContextualUpdateWithGateway(
  context: any,
  files: any[],
  messages: any[]
): Promise<any> {
  const gatewayService = await getAIGatewayService()

  try {
    console.log('🔄 Processing contextual update with AI Gateway...')
    const result = await gatewayService.processContextualUpdate(context, files, messages)

    console.log(`✅ Contextual update completed. Success: ${result.success}`)
    return result
  } catch (error) {
    console.error('❌ Contextual update failed:', error)
    throw error
  }
}

/**
 * Get AI Gateway statistics and health
 */
export async function getGatewayStats(): Promise<any> {
  const gatewayService = await getAIGatewayService()

  const stats = gatewayService.getStats()
  const healthStatus = (gatewayService as any).healthCheckService?.getCurrentHealthStatus()

  return {
    service: stats,
    health: healthStatus,
    timestamp: new Date().toISOString()
  }
}

/**
 * Example usage in a React component
 */
export const useAIGateway = () => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    initializeAIGatewayForApp()
      .then(() => setIsInitialized(true))
      .catch(err => setError(err.message))
  }, [])

  const generateCode = React.useCallback(async (request: GenerateRequest) => {
    if (!isInitialized) {
      throw new Error('AI Gateway not initialized')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await generateCodeWithGateway(request)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [isInitialized])

  const generateCodeStream = React.useCallback(async (
    request: GenerateRequest,
    onChunk: (chunk: string) => void
  ) => {
    if (!isInitialized) {
      throw new Error('AI Gateway not initialized')
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await generateCodeStreamWithGateway(request, onChunk)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [isInitialized])

  return {
    isInitialized,
    isGenerating,
    error,
    generateCode,
    generateCodeStream,
    getStats: getGatewayStats
  }
}

/**
 * Migration helper to transition from old AI service to new AI Gateway
 */
export class AIMigrationHelper {
  /**
   * Convert old AI service request to new format
   */
  static convertLegacyRequest(legacyRequest: any): GenerateRequest {
    return {
      prompt: legacyRequest.prompt,
      context: {
        project_id: legacyRequest.context?.project_id || legacyRequest.context?.projectId,
        user_id: legacyRequest.context?.user_id || legacyRequest.context?.userId,
        framework: legacyRequest.context?.framework,
        template: legacyRequest.context?.template,
        architecture: legacyRequest.context?.architecture,
        constraints: legacyRequest.context?.constraints,
        examples: legacyRequest.context?.examples
      },
      existing_files: legacyRequest.existing_files,
      chat_history: legacyRequest.chat_history,
      options: {
        temperature: legacyRequest.options?.temperature,
        max_tokens: legacyRequest.options?.max_tokens,
        stream: legacyRequest.options?.stream
      }
    }
  }

  /**
   * Convert new AI Gateway response to legacy format
   */
  static convertLegacyResponse(gatewayResponse: GenerateResponse): any {
    return {
      success: gatewayResponse.success,
      files: gatewayResponse.files,
      operations: gatewayResponse.operations,
      reasoning: gatewayResponse.reasoning,
      confidence: gatewayResponse.confidence,
      next_steps: gatewayResponse.next_steps,
      warnings: gatewayResponse.warnings,
      build_config: gatewayResponse.build_config,
      deployment_config: gatewayResponse.deployment_config
    }
  }
}

/**
 * Utility function to parse streaming response
 */
function parseStreamingResponse(content: string): GenerateResponse {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content)
    return parsed
  } catch {
    // If not JSON, create a simple file with the content
    return {
      success: true,
      files: [{
        id: `generated-${Date.now()}`,
        name: 'generated.txt',
        type: 'txt' as const,
        content: content
      }],
      operations: [{
        type: 'create' as const,
        file: 'generated.txt',
        content: content,
        reason: 'Generated from streaming response'
      }],
      reasoning: 'Generated from streaming content'
    }
  }
}

/**
 * Example of how to integrate with existing code
 */
export class AIGatewayIntegration {
  private gatewayService = getAIGatewayService()

  /**
   * Replace existing generateCodeWithAI function
   */
  async generateCodeWithAI(request: GenerateRequest): Promise<GenerateResponse> {
    console.log('🔄 Using new AI Gateway service...')

    try {
      // Convert legacy request if needed
      const gatewayRequest = AIMigrationHelper.convertLegacyRequest(request)

      // Use the new gateway service
      const gatewayResponse = await generateCodeWithGateway(gatewayRequest)

      // Convert back to legacy format
      return AIMigrationHelper.convertLegacyResponse(gatewayResponse)
    } catch (error) {
      console.error('❌ AI Gateway request failed, falling back to legacy service:', error)

      // Fallback to original implementation if needed
      // return await originalGenerateCodeWithAI(request)
      throw error
    }
  }

  /**
   * Enhanced version with caching and rate limiting
   */
  async generateCodeWithEnhancements(request: GenerateRequest): Promise<GenerateResponse> {
    const gateway = await this.gatewayService

    try {
      // The gateway automatically handles caching, rate limiting, and retries
      const response = await gateway.generateResponse(request)

      // Log performance metrics
      const stats = gateway.getStats()
      console.log('📊 Gateway Stats:', {
        cacheHitRate: stats.services.cache.metrics.hitRate,
        errorRate: stats.services.metrics.requests.errorRate,
        activeRequests: stats.pendingRequests
      })

      return response
    } catch (error) {
      console.error('❌ Enhanced generation failed:', error)
      throw error
    }
  }

  /**
   * Streaming version with real-time updates
   */
  async generateCodeWithStreaming(
    request: GenerateRequest,
    onProgress: (progress: { chunk: string; progress: number }) => void
  ): Promise<GenerateResponse> {
    const gateway = await this.gatewayService
    let chunkCount = 0

    try {
      let fullContent = ''

      for await (const chunk of gateway.generateResponseStream(request)) {
        fullContent += chunk
        chunkCount++

        onProgress({
          chunk,
          progress: chunkCount // Could be enhanced with actual progress calculation
        })
      }

      return parseStreamingResponse(fullContent)
    } catch (error) {
      console.error('❌ Streaming generation failed:', error)
      throw error
    }
  }
}

/**
 * Example environment variables for AI Gateway configuration
 */
export const AI_GATEWAY_ENV_EXAMPLE = `
# AI Gateway Configuration
VITE_AI_GATEWAY_DEFAULT_PROVIDER=glm
VITE_AI_GATEWAY_TIMEOUT=30000
VITE_AI_GATEWAY_RETRY_ATTEMPTS=3
VITE_AI_GATEWAY_RETRY_DELAY=1000

# Cache Configuration
VITE_AI_GATEWAY_CACHE_ENABLED=true
VITE_AI_GATEWAY_CACHE_TTL=300000
VITE_AI_GATEWAY_CACHE_MAX_SIZE=1000
VITE_AI_GATEWAY_CACHE_STRATEGY=lru

# Rate Limiting Configuration
VITE_AI_GATEWAY_RATE_LIMIT_ENABLED=true
VITE_AI_GATEWAY_RATE_LIMIT=100
VITE_AI_GATEWAY_RATE_LIMIT_WINDOW=60000

# Monitoring Configuration
VITE_AI_GATEWAY_MONITORING_ENABLED=true
VITE_AI_GATEWAY_LOG_LEVEL=info
VITE_AI_GATEWAY_METRICS_ENABLED=true

# Health Check Configuration
VITE_AI_GATEWAY_HEALTH_CHECK_ENABLED=true
VITE_AI_GATEWAY_HEALTH_CHECK_INTERVAL=30000

# Feature Flags
VITE_AI_GATEWAY_FEATURE_CACHING=true
VITE_AI_GATEWAY_FEATURE_RATE_LIMITING=true
VITE_AI_GATEWAY_FEATURE_STREAMING=true
VITE_AI_GATEWAY_FEATURE_MONITORING=true
VITE_AI_GATEWAY_FEATURE_HEALTH_CHECKS=true
`

