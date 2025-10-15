// Project service implementation

import { BaseService } from './base'
import { Project, CreateProjectRequest, UpdateProjectRequest, ProjectListParams, User } from '../types/api'
import { ErrorFactory } from '../utils/errors'

export class ProjectService extends BaseService {
  /**
   * Get projects for a user with pagination and filtering
   */
  async getProjects(userId: string, params: ProjectListParams): Promise<{ items: Project[]; total: number }> {
    // In a real implementation, this would query your database
    // For now, we'll return mock data

    const { page, limit, status, search, sort, order } = params
    const offset = this.getOffset(page, limit)

    // Build query filters
    const filters: any = { user_id: userId, userId: userId } // Support both naming conventions
    if (status) filters.status = status
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // Build sort options
    const sortOptions: any = {}
    if (sort) {
      sortOptions[sort] = order === 'asc' ? 1 : -1
    } else {
      sortOptions.updated_at = -1
    }

    try {
      // Mock database query
      const mockProjects = this.generateMockProjects(userId, 50)
      const total = mockProjects.length

      // Apply filters
      let filteredProjects = mockProjects
      if (status) {
        filteredProjects = filteredProjects.filter(p => p.status === status)
      }
      if (search) {
        const searchLower = search.toLowerCase()
        filteredProjects = filteredProjects.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
        )
      }

      // Apply sorting
      filteredProjects.sort((a, b) => {
        const aValue = a[sort as keyof Project] || ''
        const bValue = b[sort as keyof Project] || ''

        if (order === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

      // Apply pagination
      const paginatedProjects = filteredProjects.slice(offset, offset + limit)

      return {
        items: paginatedProjects,
        total: filteredProjects.length
      }
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to fetch projects')
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(projectId: string, userId: string): Promise<Project> {
    if (!this.isValidUUID(projectId)) {
      throw ErrorFactory.badRequest('Invalid project ID format')
    }

    try {
      // Mock database query
      const project = this.generateMockProjects(userId, 1)[0]

      if (!project) {
        throw ErrorFactory.notFound('Project', projectId)
      }

      if (project.user_id !== userId && project.userId !== userId) {
        throw ErrorFactory.forbidden('access', 'project')
      }

      return project
    } catch (error) {
      if (error instanceof ErrorFactory.NotFoundError || error instanceof ErrorFactory.AuthorizationError) {
        throw error
      }
      throw ErrorFactory.databaseError('Failed to fetch project')
    }
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, data: CreateProjectRequest): Promise<Project> {
    this.validateRequiredFields(data, ['name'])

    // Validate name uniqueness for user
    if (data.name && data.name.length > 100) {
      throw ErrorFactory.badRequest('Project name too long (max 100 characters)')
    }

    if (data.description && data.description.length > 500) {
      throw ErrorFactory.badRequest('Project description too long (max 500 characters)')
    }

    try {
      const project: Project = {
        id: this.generateUUID(),
        name: data.name,
        description: data.description,
        prompt: data.prompt,
        files: [],
        messages: [],
        metadata: {
          framework: data.framework,
          template: data.template,
          version: '1.0.0'
        },
        settings: {
          theme: {
            mode: 'light',
            primary_color: '#000000'
          },
          editor: {
            tab_size: 2,
            word_wrap: true,
            minimap: false,
            line_numbers: true,
            font_size: 14,
            theme: 'vs-dark'
          },
          preview: {
            auto_refresh: true,
            device: 'desktop',
            orientation: 'landscape',
            size: { width: 1920, height: 1080 }
          },
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 2000,
            context_window: 4000,
            auto_suggestions: true,
            code_completion: true
          },
          collaboration: {
            real_time: false,
            permissions: []
          }
        },
        status: 'draft',
        userId: userId,
        user_id: userId, // Keep both for compatibility
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        created_at: new Date().toISOString(), // Keep both for compatibility
        updated_at: new Date().toISOString() // Keep both for compatibility
      }

      // Merge user-provided settings with defaults
      if (data.settings) {
        project.settings = this.deepMerge(project.settings, data.settings)
      }

      // In a real implementation, save to database
      console.log(`Created project: ${project.id} for user: ${userId}`)

      return project
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to create project')
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, userId: string, data: UpdateProjectRequest): Promise<Project> {
    if (!this.isValidUUID(projectId)) {
      throw ErrorFactory.badRequest('Invalid project ID format')
    }

    // Get existing project
    const existingProject = await this.getProject(projectId, userId)

    try {
      const updatedProject: Project = {
        ...existingProject,
        ...data,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString() // Keep both for compatibility
      }

      // Deep merge metadata and settings if provided
      if (data.metadata) {
        updatedProject.metadata = this.deepMerge(existingProject.metadata, data.metadata)
      }

      if (data.settings) {
        updatedProject.settings = this.deepMerge(existingProject.settings, data.settings)
      }

      // In a real implementation, update in database
      console.log(`Updated project: ${projectId}`)

      return updatedProject
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to update project')
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    if (!this.isValidUUID(projectId)) {
      throw ErrorFactory.badRequest('Invalid project ID format')
    }

    // Check if project exists and user has access
    await this.getProject(projectId, userId)

    try {
      // In a real implementation, delete from database
      console.log(`Deleted project: ${projectId}`)
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to delete project')
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(userId: string): Promise<{
    total: number
    active: number
    draft: number
    archived: number
    recent: number
  }> {
    try {
      // Mock implementation
      const projects = this.generateMockProjects(userId, 20)

      return {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        draft: projects.filter(p => p.status === 'draft').length,
        archived: projects.filter(p => p.status === 'archived').length,
        recent: projects.filter(p => {
          const updated = new Date(p.updated_at)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return updated > weekAgo
        }).length
      }
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to fetch project statistics')
    }
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(projectId: string, userId: string, newName?: string): Promise<Project> {
    const originalProject = await this.getProject(projectId, userId)

    try {
      const duplicatedProject: Project = {
        ...originalProject,
        id: this.generateUUID(),
        name: newName || `${originalProject.name} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        created_at: new Date().toISOString(), // Keep both for compatibility
        updated_at: new Date().toISOString() // Keep both for compatibility
      }

      // In a real implementation, save to database
      console.log(`Duplicated project: ${projectId} -> ${duplicatedProject.id}`)

      return duplicatedProject
    } catch (error) {
      throw ErrorFactory.databaseError('Failed to duplicate project')
    }
  }

  /**
   * Archive a project
   */
  async archiveProject(projectId: string, userId: string): Promise<Project> {
    return this.updateProject(projectId, userId, { status: 'archived' })
  }

  /**
   * Restore an archived project
   */
  async restoreProject(projectId: string, userId: string): Promise<Project> {
    return this.updateProject(projectId, userId, { status: 'draft' })
  }

  /**
   * Generate mock project data for testing
   */
  private generateMockProjects(userId: string, count: number): Project[] {
    const projects: Project[] = []
    const statuses: Project['status'][] = ['draft', 'active', 'archived']
    const frameworks = ['react', 'vue', 'angular', 'vanilla', 'svelte']
    const templates = ['blank', 'dashboard', 'e-commerce', 'blog', 'portfolio']

    for (let i = 0; i < count; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const framework = frameworks[Math.floor(Math.random() * frameworks.length)] as any
      const template = templates[Math.floor(Math.random() * templates.length)] as any

      projects.push({
        id: this.generateUUID(),
        name: `Project ${i + 1}`,
        description: `Mock project ${i + 1} for testing`,
        prompt: `Create a ${template} application using ${framework}`,
        files: [],
        messages: [],
        metadata: {
          framework,
          template,
          version: '1.0.0',
          tags: ['test', 'demo']
        },
        settings: {
          theme: { mode: 'light', primary_color: '#000000' },
          editor: {
            tab_size: 2,
            word_wrap: true,
            minimap: false,
            line_numbers: true,
            font_size: 14,
            theme: 'vs-dark'
          },
          preview: {
            auto_refresh: true,
            device: 'desktop',
            orientation: 'landscape',
            size: { width: 1920, height: 1080 }
          },
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 2000,
            context_window: 4000,
            auto_suggestions: true,
            code_completion: true
          },
          collaboration: {
            real_time: false,
            permissions: []
          }
        },
        status,
        userId: userId,
        user_id: userId, // Keep both for compatibility
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Keep both for compatibility
        updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Keep both for compatibility
      })
    }

    return projects
  }

  /**
   * Generate a UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}