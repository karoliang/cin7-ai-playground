import { GenerateRequest, GenerateResponse } from '@/types'
import { MultiPageArchitecture } from '@/lib/multiPageArchitecture'
import { getGLMService, createGLMConfigFromEnv, validateGLMConfig, isGLMServiceInitialized } from './glmService'

const API_URL = import.meta.env.VITE_API_URL || 'https://amkkihoeeqpktaxauauk.supabase.co/functions/v1'
const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'glm' // 'glm' or 'supabase'

export async function generateCodeWithAI(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    // Choose AI provider based on configuration
    if (AI_PROVIDER === 'glm') {
      return await generateCodeWithGLM(request)
    } else {
      return await generateCodeWithSupabase(request)
    }
  } catch (error) {
    console.error('AI Service Error:', error)
    return {
      success: false,
      files: [],
      operations: [],
      error: error instanceof Error ? error.message : 'Failed to generate code'
    }
  }
}

/**
 * Generate code using GLM (ZhipuAI) service
 */
async function generateCodeWithGLM(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    // Initialize GLM service if not already done
    if (!isGLMServiceInitialized()) {
      try {
        const config = createGLMConfigFromEnv()
        const validationErrors = validateGLMConfig(config)

        if (validationErrors.length > 0) {
          throw new Error(`GLM configuration errors: ${validationErrors.join(', ')}`)
        }

        getGLMService(config, {
          enableLogging: (import.meta.env as any).VITE_GLM_ENABLE_LOGGING === 'true'
        })
      } catch (error) {
        console.error('Failed to initialize GLM service:', error)
        throw new Error('GLM service initialization failed. Please check your API configuration.')
      }
    }

    const glmService = getGLMService()

    // Enhance prompt with architectural guidance
    const enhancedPrompt = MultiPageArchitecture.enhancePromptWithArchitecturalGuidance(
      request.prompt,
      request.existing_files
    )

    // Detect architecture for file structure generation
    const detectedArchitecture = MultiPageArchitecture.detectOptimalStructure(
      request.prompt,
      request.existing_files
    )

    // Create enhanced request for GLM
    const glmRequest: GenerateRequest = {
      ...request,
      prompt: enhancedPrompt.enhancedPrompt,
      context: {
        ...request.context,
        architecture: {
          ...detectedArchitecture,
          type: detectedArchitecture.structure || 'multi-page'
        }
      }
    }

    const response = await glmService.generateCode(glmRequest)

    // Generate proper file structure if not provided by AI
    let files = response.files || []
    if (files.length === 0 && detectedArchitecture.structure !== 'single-page') {
      files = MultiPageArchitecture.generateFileStructure(detectedArchitecture, 'Generated Project')
    }

    return {
      ...response,
      files
    }

  } catch (error) {
    console.error('GLM Service Error:', error)
    throw error
  }
}

/**
 * Generate code using original Supabase edge function (fallback)
 */
async function generateCodeWithSupabase(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    // Enhance prompt with architectural guidance
    const enhancedPrompt = MultiPageArchitecture.enhancePromptWithArchitecturalGuidance(
      request.prompt,
      request.existing_files
    )

    // Detect architecture for file structure generation
    const detectedArchitecture = MultiPageArchitecture.detectOptimalStructure(
      request.prompt,
      request.existing_files
    )

    const response = await fetch(`${API_URL}/generate-cin7`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt.enhancedPrompt,
        existing_files: request.existing_files,
        chat_history: request.chat_history,
        context: {
          ...request.context,
          architecture: {
            ...detectedArchitecture,
            type: detectedArchitecture.structure || 'multi-page'
          }
        },
        options: request.options
      })
    })

    if (!response.ok) {
      let errorMessage
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || `API error: ${response.status} ${response.statusText}`
      } catch {
        errorMessage = `API error: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Generate proper file structure if not provided by AI
    let files = data.files || []
    if (files.length === 0 && detectedArchitecture.structure !== 'single-page') {
      files = MultiPageArchitecture.generateFileStructure(detectedArchitecture, 'Generated Project')
    }

    return {
      success: true,
      files,
      operations: data.operations || [],
      reasoning: data.reasoning,
      next_steps: data.next_steps,
      warnings: data.warnings
    }

  } catch (error) {
    console.error('Supabase AI Service Error:', error)
    throw error
  }
}

export async function processContextualUpdate(
  context: any,
  files: any[],
  messages: any[]
): Promise<any> {
  try {
    // Choose AI provider based on configuration
    if (AI_PROVIDER === 'glm') {
      return await processContextualUpdateWithGLM(context, files, messages)
    } else {
      return await processContextualUpdateWithSupabase(context, files, messages)
    }
  } catch (error) {
    console.error('Contextual Update Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process contextual update'
    }
  }
}

/**
 * Process contextual update using GLM service
 */
async function processContextualUpdateWithGLM(
  context: any,
  files: any[],
  messages: any[]
): Promise<any> {
  try {
    // Initialize GLM service if not already done
    if (!isGLMServiceInitialized()) {
      try {
        const config = createGLMConfigFromEnv()
        const validationErrors = validateGLMConfig(config)

        if (validationErrors.length > 0) {
          throw new Error(`GLM configuration errors: ${validationErrors.join(', ')}`)
        }

        getGLMService(config, {
          enableLogging: (import.meta.env as any).VITE_GLM_ENABLE_LOGGING === 'true'
        })
      } catch (error) {
        console.error('Failed to initialize GLM service:', error)
        throw new Error('GLM service initialization failed. Please check your API configuration.')
      }
    }

    const glmService = getGLMService()
    return await glmService.processContextualUpdate(context, files, messages)

  } catch (error) {
    console.error('GLM Contextual Update Error:', error)
    throw error
  }
}

/**
 * Process contextual update using original Supabase edge function (fallback)
 */
async function processContextualUpdateWithSupabase(
  context: any,
  files: any[],
  messages: any[]
): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/contextual-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        context,
        existing_files: files,
        chat_history: messages
      })
    })

    if (!response.ok) {
      throw new Error(`Contextual update failed: ${response.status}`)
    }

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Supabase Contextual Update Error:', error)
    throw error
  }
}