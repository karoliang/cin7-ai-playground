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
  error?: {
    code: string
    message: string
    details?: any
  }
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
  userId: string
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