// Composite middleware that combines common functionality

import { NextRequest, NextResponse } from 'next/server'
import { AuthContext } from './auth'
import { LoggingConfig } from './logging'
import { RateLimitConfig } from './rateLimiting'
import { withAuth, withOptionalAuth, withLogging, withRateLimit } from './index'

export interface APIConfig {
  auth?: 'required' | 'optional' | 'none'
  rateLimit?: Partial<RateLimitConfig>
  logging?: Partial<LoggingConfig>
  cors?: boolean
  validation?: {
    body?: string
    query?: string
    params?: string
  }
}

/**
 * Composite middleware that combines authentication, rate limiting, logging, and CORS
 */
export function withAPI(
  config: APIConfig = {}
) {
  const {
    auth = 'required',
    rateLimit,
    logging,
    cors = true,
    validation
  } = config

  return (
    handler: (request: NextRequest, context?: AuthContext, data?: any) => Promise<NextResponse>
  ) => {
    let enhancedHandler = handler

    // Add validation middleware if specified
    if (validation) {
      const { withValidation } = require('./validation')

      if (validation.body) {
        const bodyValidation = withValidation(validation.body as any, 'body')
        enhancedHandler = bodyValidation(enhancedHandler)
      }

      if (validation.query) {
        const queryValidation = withValidation(validation.query as any, 'query')
        enhancedHandler = queryValidation(enhancedHandler)
      }

      if (validation.params) {
        const paramsValidation = withValidation(validation.params as any, 'params')
        enhancedHandler = paramsValidation(enhancedHandler)
      }
    }

    // Add authentication middleware
    if (auth === 'required') {
      enhancedHandler = withAuth(enhancedHandler)
    } else if (auth === 'optional') {
      enhancedHandler = withOptionalAuth(enhancedHandler)
    }

    // Add rate limiting middleware
    if (rateLimit) {
      enhancedHandler = withRateLimit(rateLimit)(enhancedHandler)
    }

    // Add logging middleware
    if (logging) {
      enhancedHandler = withLogging(logging)(enhancedHandler)
    }

    // Add CORS handling
    if (cors) {
      enhancedHandler = withCors(enhancedHandler)
    }

    return enhancedHandler
  }
}

/**
 * CORS middleware
 */
function withCors(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return addCorsHeaders(response, request.headers.get('origin') || undefined)
    }

    // Execute the handler
    const response = await handler(request, context)

    // Add CORS headers to the response
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  // In production, you should validate the origin against allowed domains
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']

  if (origin && allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID')
  response.headers.set('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  response.headers.set('Vary', 'Origin')

  return response
}

/**
 * Pre-configured middleware for different API endpoint types
 */
export const withPublicAPI = (config: Partial<APIConfig> = {}) =>
  withAPI({ auth: 'optional', ...config })

export const withSecureAPI = (config: Partial<APIConfig> = {}) =>
  withAPI({ auth: 'required', ...config })

export const withAdminAPI = (config: Partial<APIConfig> = {}) =>
  withAPI({
    auth: 'required',
    rateLimit: { windowMs: 60 * 1000, maxRequests: 50 }, // More restrictive for admin
    ...config
  })

export const withAI_API = (config: Partial<APIConfig> = {}) =>
  withAPI({
    auth: 'required',
    rateLimit: { windowMs: 60 * 1000, maxRequests: 10 }, // Strict rate limiting for AI
    ...config
  })

export const withFileAPI = (config: Partial<APIConfig> = {}) =>
  withAPI({
    auth: 'required',
    rateLimit: { windowMs: 60 * 1000, maxRequests: 20 }, // Moderate rate limiting for files
    ...config
  })

/**
 * Health check endpoint middleware (no auth, minimal logging)
 */
export const withHealthCheck = (
  handler: (request: NextRequest) => Promise<NextResponse>
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()

    try {
      const response = await handler(request)

      // Add minimal performance headers
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      response.headers.set('X-Health-Status', 'healthy')

      return response
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Health check failed',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        },
        { status: 503 }
      )
    }
  }
}

/**
 * Error handling wrapper middleware
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('Unhandled API error:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        url: request.url,
        method: request.method,
        userId: context?.user?.id
      })

      // Return a generic error response
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Request timeout middleware
 */
export function withTimeout(
  timeoutMs: number = 30000 // 30 seconds default
) {
  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const timeoutPromise = new Promise<NextResponse>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      try {
        return await Promise.race([
          handler(request, context),
          timeoutPromise
        ])
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Request timeout',
              code: 'REQUEST_TIMEOUT',
              timestamp: new Date().toISOString()
            },
            { status: 408 }
          )
        }
        throw error
      }
    }
  }
}

/**
 * Request ID middleware
 */
export function withRequestID(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID()

    // Add request ID to headers for tracing
    const response = await handler(request, context)
    response.headers.set('X-Request-ID', requestId)

    return response
  }
}

/**
 * Content-Type validation middleware
 */
export function withContentType(
  allowedTypes: string[] = ['application/json']
) {
  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      // Skip validation for GET, DELETE, OPTIONS requests
      if (['GET', 'DELETE', 'OPTIONS'].includes(request.method)) {
        return handler(request, context)
      }

      const contentType = request.headers.get('content-type')

      if (!contentType) {
        return NextResponse.json(
          {
            success: false,
            error: 'Content-Type header is required',
            code: 'MISSING_CONTENT_TYPE',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        )
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type))

      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
            code: 'UNSUPPORTED_CONTENT_TYPE',
            timestamp: new Date().toISOString()
          },
          { status: 415 }
        )
      }

      return handler(request, context)
    }
  }
}

/**
 * Combine all common middleware for a production-ready API
 */
export function withProductionAPI(
  config: Partial<APIConfig> = {}
) {
  return (
    handler: (request: NextRequest, context?: AuthContext) => Promise<NextResponse>
  ) => {
    let enhancedHandler = handler

    // Apply middleware in order
    enhancedHandler = withErrorHandler(enhancedHandler)
    enhancedHandler = withRequestID(enhancedHandler)
    enhancedHandler = withTimeout(30000)(enhancedHandler) // 30 second timeout
    enhancedHandler = withContentType(['application/json'])(enhancedHandler)
    enhancedHandler = withAPI(config)(enhancedHandler)

    return enhancedHandler
  }
}