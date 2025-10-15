// Authentication middleware for API requests

import { Request, Response } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
    email_verified: boolean
  }
}

export interface AuthContext {
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
    email_verified: boolean
  }
  token: string
}

/**
 * Authentication middleware that validates JWT tokens from Supabase
 */
export async function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  supabaseClient: SupabaseClient = supabase
): Promise<{ context: AuthContext } | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      })
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error)
      response.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      })
      return null
    }

    // Check if email is verified (optional, based on your requirements)
    if (!user.email_confirmed_at) {
      response.status(403).json({
        success: false,
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        timestamp: new Date().toISOString()
      })
      return null
    }

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name,
        avatar: user.user_metadata?.avatar_url,
        email_verified: !!user.email_confirmed_at
      },
      token
    }

    // Attach user to request object
    request.user = context.user

    return { context }
  } catch (error) {
    console.error('Auth middleware error:', error)
    response.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString()
    })
    return null
  }
}

/**
 * Higher-order function that wraps API handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, response: Response, context: AuthContext, ...args: T) => Promise<void>
) {
  return async (request: AuthenticatedRequest, response: Response, ...args: T): Promise<void> => {
    const authResult = await authMiddleware(request, response)

    if (!authResult) {
      return // authMiddleware already sent the response
    }

    return handler(request, response, authResult.context, ...args)
  }
}

/**
 * Extract user ID from authenticated request
 */
export function getUserIdFromRequest(request: AuthenticatedRequest): string {
  return request.user.id
}

/**
 * Check if user has required permissions
 */
export function hasPermission(
  _user: AuthContext['user'],
  _resource: string,
  _action: string
): boolean {
  // Implement your permission logic here
  // For now, all authenticated users have access
  return true
}

/**
 * Permission middleware
 */
export function withPermission(
  resource: string,
  action: string
) {
  return (
    handler: (request: AuthenticatedRequest, response: Response, context: AuthContext, ...args: any[]) => Promise<void>
  ) => {
    return withAuth(async (request, response, context, ...args) => {
      if (!hasPermission(context.user, resource, action)) {
        response.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString()
        })
        return
      }

      return handler(request, response, context, ...args)
    })
  }
}

/**
 * Optional authentication middleware - allows unauthenticated access
 */
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  supabaseClient: SupabaseClient = supabase
): Promise<{ context?: AuthContext }> {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { context: undefined }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { context: undefined }
    }

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name,
        avatar: user.user_metadata?.avatar_url,
        email_verified: !!user.email_confirmed_at
      },
      token
    }

    return { context }
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    return { context: undefined }
  }
}

/**
 * Higher-order function for optional authentication
 */
export function withOptionalAuth<T extends any[]>(
  handler: (request: AuthenticatedRequest, response: Response, context?: AuthContext, ...args: T) => Promise<void>
) {
  return async (request: AuthenticatedRequest, response: Response, ...args: T): Promise<void> => {
    const authResult = await optionalAuthMiddleware(request)

    return handler(request, response, authResult.context, ...args)
  }
}

/**
 * API key authentication for service-to-service communication
 */
export async function apiKeyAuthMiddleware(
  request: AuthenticatedRequest,
  validApiKey: string
): Promise<boolean> {
  const apiKey = request.headers['x-api-key']
  return apiKey === validApiKey
}

/**
 * Rate limiting per user
 */
export function getUserRateLimitKey(userId: string, endpoint: string): string {
  return `rate_limit:${userId}:${endpoint}`
}

/**
 * CORS middleware helper
 */
export function addCorsHeaders(response: Response, origin?: string): Response {
  response.setHeader('Access-Control-Allow-Origin', origin || '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  response.setHeader('Access-Control-Max-Age', '86400')
  return response
}

/**
 * Handle preflight requests
 */
export function handleCors(request: AuthenticatedRequest, response: Response): boolean {
  if (request.method === 'OPTIONS') {
    addCorsHeaders(response, request.headers.origin)
    response.status(200).end()
    return true
  }
  return false
}