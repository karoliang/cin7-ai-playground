/**
 * Files Routes
 * API endpoints for file operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { FileService, FileUploadRequest, FileUpdateRequest } from '../services/file'
import { RequestContext, APIResponse } from '../types/api'

const fileService = new FileService()

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

// POST /api/files - Create a new file
export async function POST(req: NextRequest) {
  try {
    const context = createRequestContext(req)
    const body = await req.json()
    const request: FileUploadRequest = body

    const result = await fileService.createFile(request, context)

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// GET /api/files/[fileId] - Get a specific file
export async function GET(req: NextRequest, { params }: { params: { fileId?: string; projectId?: string } }) {
  try {
    const context = createRequestContext(req)

    // If projectId is provided, get project files
    if (params.projectId) {
      const result = await fileService.getProjectFiles(params.projectId, context)

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

    // If fileId is provided, get specific file
    if (params.fileId) {
      const result = await fileService.getFile(params.fileId, context)

      if (!result) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found'
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
    }

    // No valid params provided
    const response: APIResponse = {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Either fileId or projectId must be provided'
      }
    }
    return NextResponse.json(response, { status: 400 })

  } catch (error) {
    console.error('Error getting file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// PUT /api/files/[fileId] - Update a file
export async function PUT(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const context = createRequestContext(req)
    const body = await req.json()

    const request: FileUpdateRequest = {
      id: params.fileId,
      ...body
    }

    const result = await fileService.updateFile(request, context)

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
    console.error('Error updating file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}

// DELETE /api/files/[fileId] - Delete a file
export async function DELETE(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const context = createRequestContext(req)
    await fileService.deleteFile(params.fileId, context)

    const response: APIResponse = {
      success: true,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    return NextResponse.json(response, { status: 500 })
  }
}