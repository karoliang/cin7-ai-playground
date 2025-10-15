/**
 * File Service
 * Handles file operations and management
 */

import { ProjectFile, RequestContext } from '../types/api'
import { supabase } from '@/lib/supabase'

export interface FileUploadRequest {
  projectId: string
  name: string
  content: string
  type: string
  path?: string
}

export interface FileUpdateRequest {
  id: string
  content?: string
  name?: string
  path?: string
}

export class FileService {
  async createFile(request: FileUploadRequest, context?: RequestContext): Promise<ProjectFile> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .insert([{
          project_id: request.projectId,
          name: request.name,
          content: request.content,
          type: request.type,
          path: request.path || request.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: context?.user?.id
        }])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create file: ${error.message}`)
      }

      return this.transformDbFileToProjectFile(data)
    } catch (error) {
      console.error('Error creating file:', error)
      throw error
    }
  }

  async getFile(fileId: string, context?: RequestContext): Promise<ProjectFile | null> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to get file: ${error.message}`)
      }

      return this.transformDbFileToProjectFile(data)
    } catch (error) {
      console.error('Error getting file:', error)
      throw error
    }
  }

  async updateFile(request: FileUpdateRequest, context?: RequestContext): Promise<ProjectFile> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (request.content !== undefined) {
        updateData.content = request.content
      }
      if (request.name !== undefined) {
        updateData.name = request.name
      }
      if (request.path !== undefined) {
        updateData.path = request.path
      }

      const { data, error } = await supabase
        .from('project_files')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update file: ${error.message}`)
      }

      return this.transformDbFileToProjectFile(data)
    } catch (error) {
      console.error('Error updating file:', error)
      throw error
    }
  }

  async deleteFile(fileId: string, context?: RequestContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  async getProjectFiles(projectId: string, context?: RequestContext): Promise<ProjectFile[]> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to get project files: ${error.message}`)
      }

      return data.map(file => this.transformDbFileToProjectFile(file))
    } catch (error) {
      console.error('Error getting project files:', error)
      throw error
    }
  }

  private transformDbFileToProjectFile(dbFile: any): ProjectFile {
    return {
      id: dbFile.id,
      projectId: dbFile.project_id,
      name: dbFile.name,
      path: dbFile.path,
      content: dbFile.content || '',
      type: dbFile.type,
      size: dbFile.content ? dbFile.content.length : 0,
      createdAt: dbFile.created_at,
      updatedAt: dbFile.updated_at
    }
  }
}

export default FileService