/**
 * AI Routes
 * API endpoints for AI-related operations
 */

import { Request, Response } from 'express'
import { AIService, ChatCompletionRequest } from '../services/ai'
import { RequestContext, APIResponse } from '../types/api'

const aiService = new AIService({
  provider: 'zhipu',
  apiKey: process.env.ZHIPU_API_KEY || '',
  model: 'glm-4',
  maxTokens: 4000,
  temperature: 0.7
})

export const generateCode = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const request: ChatCompletionRequest = req.body
    const result = await aiService.generateCode(request, context)

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error generating code:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const validateCode = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const { code, language } = req.body
    const result = await aiService.validateCode(code, language, context)

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error validating code:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  generateCode,
  validateCode
}