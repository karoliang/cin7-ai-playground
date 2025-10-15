/**
 * Users Routes
 * API endpoints for user operations
 */

import { Request, Response } from 'express'
import { UserService, UserUpdateRequest } from '../services/user'
import { RequestContext, APIResponse } from '../types/api'

const userService = new UserService()

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const userId = req.params.userId || context.user?.id
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        }
      }
      return res.status(400).json(response)
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
      return res.status(404).json(response)
    }

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
    console.error('Error getting user profile:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'USER_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const userId = req.params.userId || context.user?.id
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        }
      }
      return res.status(400).json(response)
    }

    const request: UserUpdateRequest = req.body
    const result = await userService.updateUserProfile(userId, request, context)

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
    console.error('Error updating user profile:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'USER_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const userId = req.params.userId || context.user?.id
    if (!userId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required'
        }
      }
      return res.status(400).json(response)
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

    res.json(response)
  } catch (error) {
    console.error('Error getting user projects:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'PROJECTS_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  getUserProfile,
  updateUserProfile,
  getUserProjects
}