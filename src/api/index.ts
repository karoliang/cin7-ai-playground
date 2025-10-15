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
export * from './routes/projects'
export * from './routes/ai'
export * from './routes/files'
export * from './routes/users'
export * from './routes/health'

// Configuration
export { APIConfig, defaultAPIConfig } from './config'