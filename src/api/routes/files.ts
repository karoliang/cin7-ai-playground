/**
 * Files Routes
 * API endpoints for file operations
 */

import { Request, Response } from 'express'
import { FileService, FileUploadRequest, FileUpdateRequest } from '../services/file'
import { RequestContext, APIResponse } from '../types/api'

const fileService = new FileService()

export const createFile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const request: FileUploadRequest = req.body
    const result = await fileService.createFile(request, context)

    const response: APIResponse = {
      success: true,
      data: result,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('Error creating file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const getFile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const { fileId } = req.params
    const result = await fileService.getFile(fileId, context)

    if (!result) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
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
    console.error('Error getting file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const updateFile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const { fileId } = req.params
    const request: FileUpdateRequest = {
      id: fileId,
      ...req.body
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

    res.json(response)
  } catch (error) {
    console.error('Error updating file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const { fileId } = req.params
    await fileService.deleteFile(fileId, context)

    const response: APIResponse = {
      success: true,
      meta: {
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error deleting file:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    const context: RequestContext = {
      user: req.user,
      requestId: req.id,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }

    const { projectId } = req.params
    const result = await fileService.getProjectFiles(projectId, context)

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
    console.error('Error getting project files:', error)
    const response: APIResponse = {
      success: false,
      error: {
        code: 'FILES_GET_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
    res.status(500).json(response)
  }
}

export default {
  createFile,
  getFile,
  updateFile,
  deleteFile,
  getProjectFiles
}