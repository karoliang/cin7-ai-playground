// Main API exports and configuration

export type * from './types/api'
export * from './middleware'
export * from './utils/errors'

// API services
export * from './services/base'
export * from './services/project'
export * from './services/ai'
export * from './services/file'
export * from './services/user'

// API routes
export { default as projectsRoutes } from './routes/projects'
export { default as aiRoutes } from './routes/ai'
export { default as filesRoutes } from './routes/files'
export { default as usersRoutes } from './routes/users'
export { default as healthRoutes } from './routes/health'

// Configuration
export { APIConfig, getAPIConfig } from './config'