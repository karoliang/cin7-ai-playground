/**
 * Users Routes
 * API endpoints for user operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { UserService, UserUpdateRequest } from '../services/user'
import { RequestContext, APIResponse } from '../types/api'

const userService = new UserService()

// Helper function to create request context
function createRequestContext(req: NextRequest): RequestContext {
  return {
    user: undefined, // Will be set by auth middleware
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  }
}

// GET /api/users/[userId] - Get user profile or projects
export async function GET(req: NextRequest, { params }: { params: { userId?: string } }) {
  try {
    const context = createRequestContext(req)
    const userId = params.userId

    // Check if this is a request for user projects
    const url = new URL(req.url)
    const isProjectsRequest = url.pathname.includes('/projects')

    if (isProjectsRequest) {
      if (!userId) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'USER_ID_REQUIRED',
            message: 'User ID is required'
          }
        }
        return NextResponse.json(response, { status: 400 })
      }

      const result = await userService.getUserProjects(userId, context)

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

    // Default: get user profile
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const result = await userService.getUserProfile(userId, context)

    if (!result) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error getting user data:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'USER_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// PUT /api/users/[userId] - Update user profile
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const context = createRequestContext(req)
    const body = await req.json()
    const request: UserUpdateRequest = body

    const result = await userService.updateUserProfile(params.userId, request, context)

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating user profile:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'USER_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}