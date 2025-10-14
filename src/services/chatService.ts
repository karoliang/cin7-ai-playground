import { ChatMessage, GenerateRequest, GenerateResponse } from '@/types'
import { generateCodeWithAI } from './aiService'

export interface ChatStreamOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (message: string, response: GenerateResponse) => void
  onError?: (error: Error) => void
  onProgress?: (progress: string) => void
}

export interface ChatRequest {
  message: string
  conversationHistory: ChatMessage[]
  projectFiles: any[]
  projectSettings?: any
}

export class ChatService {
  private static instance: ChatService

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async sendMessage(
    request: ChatRequest,
    options: ChatStreamOptions = {}
  ): Promise<void> {
    try {
      options.onProgress?.('Thinking...')

      // Add user message to conversation history
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString()
      }

      // Prepare the generation request
      const generateRequest: GenerateRequest = {
        prompt: request.message,
        existing_files: request.projectFiles,
        chat_history: request.conversationHistory,
        options: {
          temperature: request.projectSettings?.ai?.temperature || 0.7,
          max_tokens: request.projectSettings?.ai?.max_tokens || 4000,
          stream: false // We'll implement streaming later if needed
        }
      }

      options.onProgress?.('Generating response...')

      // Call the AI service
      const response = await generateCodeWithAI(generateRequest)

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate response')
      }

      // Create assistant message
      let assistantContent = response.reasoning || 'I\'ve processed your request. '

      // Add information about generated files
      if (response.files && response.files.length > 0) {
        assistantContent += `\n\nI've created/updated ${response.files.length} file(s):\n`
        response.files.forEach((file, index) => {
          assistantContent += `- ${file.name} (${file.type})\n`
        })
      }

      // Add next steps if available
      if (response.next_steps && response.next_steps.length > 0) {
        assistantContent += `\n\nNext steps:\n`
        response.next_steps.forEach(step => {
          assistantContent += `- ${step}\n`
        })
      }

      // Add warnings if any
      if (response.warnings && response.warnings.length > 0) {
        assistantContent += `\n\nWarnings:\n`
        response.warnings.forEach(warning => {
          assistantContent += `- ${warning}\n`
        })
      }

      // Simulate streaming for better UX
      await this.simulateStreaming(assistantContent, options.onChunk)

      options.onComplete?.(assistantContent, response)

    } catch (error) {
      console.error('Chat Service Error:', error)
      options.onError?.(error instanceof Error ? error : new Error('Unknown error occurred'))
    }
  }

  private async simulateStreaming(
    content: string,
    onChunk?: (chunk: string) => void,
    chunkSize: number = 3,
    delay: number = 30
  ): Promise<void> {
    if (!onChunk) return

    const words = content.split(' ')
    let currentChunk = ''

    for (let i = 0; i < words.length; i++) {
      currentChunk += (i > 0 ? ' ' : '') + words[i]

      if (currentChunk.split(' ').length >= chunkSize || i === words.length - 1) {
        onChunk(currentChunk)
        currentChunk = ''
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  async sendStreamingMessage(
    request: ChatRequest,
    options: ChatStreamOptions = {}
  ): Promise<void> {
    try {
      options.onProgress?.('Connecting to AI...')

      // Create a more enhanced prompt for chat interactions
      const chatPrompt = this.enhancePromptForChat(request)

      const generateRequest: GenerateRequest = {
        prompt: chatPrompt,
        existing_files: request.projectFiles,
        chat_history: request.conversationHistory,
        options: {
          temperature: request.projectSettings?.ai?.temperature || 0.7,
          max_tokens: request.projectSettings?.ai?.max_tokens || 4000,
          stream: false
        }
      }

      const response = await generateCodeWithAI(generateRequest)

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate response')
      }

      let assistantContent = this.formatChatResponse(response)

      // Stream the response
      await this.simulateStreaming(assistantContent, options.onChunk)
      options.onComplete?.(assistantContent, response)

    } catch (error) {
      console.error('Streaming Chat Error:', error)
      options.onError?.(error instanceof Error ? error : new Error('Unknown error occurred'))
    }
  }

  private enhancePromptForChat(request: ChatRequest): string {
    return `You are an AI assistant helping with a CIN7 project development. Please respond to the user's message in a helpful, conversational manner.

User message: ${request.message}

Context: This is for a CIN7 sales/inventory management system project. The user may want to:
- Generate or modify code components
- Get explanations about existing code
- Request new features or improvements
- Debug issues
- Get architectural guidance

Please provide:
1. A clear, conversational response
2. Any code changes needed (as files)
3. Explanations of what you're doing and why
4. Next steps if applicable

If generating code, focus on CIN7-related functionality like inventory management, sales workflows, product catalogs, etc.

Current project has ${request.projectFiles.length} existing files.`
  }

  private formatChatResponse(response: GenerateResponse): string {
    let content = response.reasoning || 'I\'ve processed your request. '

    if (response.files && response.files.length > 0) {
      content += `\n\n**Generated/Updated Files:**\n`
      response.files.forEach(file => {
        content += `- \`${file.name}\` (${file.type})\n`
      })
    }

    if (response.operations && response.operations.length > 0) {
      content += `\n\n**Operations Performed:**\n`
      response.operations.forEach(op => {
        content += `- ${op.type}: ${op.file}\n`
        if (op.reason) {
          content += `  Reason: ${op.reason}\n`
        }
      })
    }

    if (response.next_steps && response.next_steps.length > 0) {
      content += `\n\n**Next Steps:**\n`
      response.next_steps.forEach(step => {
        content += `- ${step}\n`
      })
    }

    if (response.warnings && response.warnings.length > 0) {
      content += `\n\n**⚠️ Warnings:**\n`
      response.warnings.forEach(warning => {
        content += `- ${warning}\n`
      })
    }

    return content
  }

  // Method to handle contextual updates via chat
  async sendContextualMessage(
    context: string,
    request: ChatRequest,
    options: ChatStreamOptions = {}
  ): Promise<void> {
    try {
      options.onProgress?.('Processing contextual update...')

      const contextualRequest = {
        ...request,
        message: `Contextual instruction: ${context}\n\nUser request: ${request.message}`
      }

      await this.sendStreamingMessage(contextualRequest, options)

    } catch (error) {
      console.error('Contextual Chat Error:', error)
      options.onError?.(error instanceof Error ? error : new Error('Contextual update failed'))
    }
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance()