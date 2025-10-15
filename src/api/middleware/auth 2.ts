// Authentication middleware for API requests

import { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface AuthenticatedRequest extends NextRequest {
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
  request: NextRequest,
  supabaseClient: SupabaseClient = supabase
): Promise<{ context: AuthContext } | NextResponse> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    // Check if email is verified (optional, based on your requirements)
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
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
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function that wraps API handlers with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authMiddleware(request, supabase)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    return handler(request, authResult.context, ...args)
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
    handler: (request: NextRequest, context: AuthContext, ...args: any[]) => Promise<NextResponse>
  ) => {
    return withAuth(async (request: NextRequest, context: AuthContext, ...args) => {
      if (!hasPermission(context.user, resource, action)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            code: 'FORBIDDEN',
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        )
      }

      return handler(request, context, ...args)
    })
  }
}

/**
 * Optional authentication middleware - allows unauthenticated access
 */
export async function optionalAuthMiddleware(
  request: NextRequest,
  supabaseClient: SupabaseClient = supabase
): Promise<{ context?: AuthContext } | NextResponse> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { context: undefined }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)

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
  handler: (request: NextRequest, context?: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await optionalAuthMiddleware(request, supabase)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    return handler(request, authResult.context, ...args)
  }
}

/**
 * API key authentication for service-to-service communication
 */
export async function apiKeyAuthMiddleware(
  request: NextRequest,
  validApiKey: string
): Promise<boolean> {
  const apiKey = request.headers.get('x-api-key')
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
export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

/**
 * Handle preflight requests
 */
export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return addCorsHeaders(response, request.headers.get('origin') || undefined)
  }
  return null
}