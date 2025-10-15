// Main API exports and configuration

export * from './types/api'
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
export { POST as aiPost } from './routes/ai'
export { GET as filesGet, POST as filesPost, PUT as filesPut, DELETE as filesDelete } from './routes/files'
export { GET as usersGet, PUT as usersPut } from './routes/users'
export { GET as healthGet } from './routes/health'

// Configuration
export { APIConfig, getAPIConfig } from './config'