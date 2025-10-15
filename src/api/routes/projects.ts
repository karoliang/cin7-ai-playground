// Project API routes

import { NextRequest, NextResponse } from 'next/server'
import { withProductionAPI } from '../middleware/composite'
import { AuthContext } from '../middleware/auth'
import { ProjectService } from '../services/project'
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListParams,
  ErrorFactory
} from '../types/api'

const projectService = new ProjectService()

// GET /api/v1/projects - List projects
export const GET = withProductionAPI({
  auth: 'required',
  rateLimit: { windowMs: 60000, maxRequests: 100 },
  validation: {
    query: 'ProjectListParams'
  }
})(async (request: NextRequest, context?: AuthContext, query?: ProjectListParams) => {
  const userId = context!.user.id
  const projects = await projectService.getProjects(userId, query!)

  return projectService.createPaginatedResponse(
    projects.items,
    query!,
    projects.total
  )
})

// POST /api/v1/projects - Create project
export const POST = withProductionAPI({
  auth: 'required',
  rateLimit: { windowMs: 60000, maxRequests: 20 },
  validation: {
    body: 'CreateProjectRequest'
  }
})(async (request: NextRequest, context?: AuthContext, data?: CreateProjectRequest) => {
  const userId = context!.user.id
  const project = await projectService.createProject(userId, data!)

  return projectService.createSuccessResponse(project)
})

// Project-specific routes would typically be in separate files or with route parameters
// For Next.js App Router, you'd create dynamic route files like [id]/route.ts

// Default export for Express router compatibility
export default {
  GET,
  POST
}