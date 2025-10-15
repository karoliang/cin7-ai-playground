/**
 * API Type Definitions
 * Central type definitions for the API layer
 */

export interface APIConfig {
  port: number
  host: string
  corsOrigins: string[]
  rateLimit: {
    windowMs: number
    max: number
  }
  auth: {
    jwtSecret: string
    sessionTimeout: number
  }
}

export interface RequestContext {
  user?: {
    id: string
    email: string
    role: string
  }
  requestId: string
  timestamp: number
  ip?: string
  userAgent?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp?: string
  meta?: {
    requestId: string
    timestamp: number
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface ProjectFile {
  id: string
  projectId: string
  name: string
  path: string
  content: string
  type: string
  size: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  template?: string
  files: ProjectFile[]
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
  created_at: string // Keep both for compatibility during transition
  updated_at: string // Keep both for compatibility during transition
  userId: string
  user_id: string // Keep both for compatibility during transition
  status?: 'active' | 'draft' | 'archived'
  prompt?: string
  metadata?: Record<string, any>
  messages?: any[] // Chat messages or project history
}

export interface RouteHandler {
  (req: any, res: any, context?: RequestContext): Promise<void> | void
}

export interface Middleware {
  (req: any, res: any, next: () => void, context?: RequestContext): Promise<void> | void
}

export interface ValidationSchema {
  [key: string]: {
    type: string
    required?: boolean
    min?: number
    max?: number
    pattern?: string
    enum?: string[]
  }
}

export interface APIRateLimitConfig {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

// ProjectFile is now imported at the top of the file

// Missing types that are being imported
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    has_next?: boolean
    has_prev?: boolean
  }
}

export interface CreateProjectRequest {
  name: string
  description?: string
  template?: string
  settings?: Record<string, any>
  prompt?: string
  framework?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  template?: string
  settings?: Record<string, any>
  status?: 'active' | 'draft' | 'archived'
  metadata?: Record<string, any>
}

export interface ProjectListParams extends PaginationParams {
  search?: string
  template?: string
  status?: 'active' | 'draft' | 'archived'
  sort?: string
  order?: 'asc' | 'desc'
}

export interface User {
  id: string
  email: string
  name?: string
  role: string
  createdAt: string
  updatedAt: string
}