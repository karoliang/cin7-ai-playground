import { GenerateRequest, GenerateResponse } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'https://amkkihoeeqpktaxauauk.supabase.co/functions/v1'

export async function generateCodeWithAI(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_URL}/generate-cin7`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        existing_files: request.existing_files,
        chat_history: request.chat_history,
        context: request.context,
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

    return {
      success: true,
      files: data.files || [],
      operations: data.operations || [],
      reasoning: data.reasoning,
      confidence: data.confidence,
      build_config: data.build_config,
      deployment_config: data.deployment_config,
      next_steps: data.next_steps,
      warnings: data.warnings
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

export async function processContextualUpdate(
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
    console.error('Contextual Update Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process contextual update'
    }
  }
}