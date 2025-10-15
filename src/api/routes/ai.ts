/**
 * AI Routes
 * API endpoints for AI-related operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIService, ChatCompletionRequest } from '../services/ai'
import { RequestContext, APIResponse } from '../types/api'

const aiService = new AIService({
  provider: 'zhipu',
  apiKey: process.env.ZHIPU_API_KEY || '',
  model: 'glm-4',
  maxTokens: 4000,
  temperature: 0.7
})

export async function POST(req: NextRequest) {
  try {
    const context: RequestContext = {
      user: undefined, // Will be set by auth middleware
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    }

    const body = await req.json()
    const request: ChatCompletionRequest = body

    // Check if this is a generate or validate request
    if (body.code && body.language) {
      // Validate code request
      const result = await aiService.validateCode(body.code, body.language, context)

      const response: APIResponse = {
        success: true,
        data: result,
        meta: {
          requestId: context.requestId,
          timestamp: context.timestamp
        }
      }

      return NextResponse.json(response)
    } else {
      // Generate code request
      const result = await aiService.generateCode(request, context)

      const response: APIResponse = {
        success: true,
        data: result,
        meta: {
          requestId: context.requestId,
          timestamp: context.timestamp
        }
      }

      return NextResponse.json(response)
    }

  } catch (error) {
    console.error('Error in AI endpoint:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}