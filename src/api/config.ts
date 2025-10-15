// API configuration

import { APIConfig } from './types/api'

export interface APIEnvironmentConfig {
  name: string
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
  enableLogging: boolean
  enableMetrics: boolean
  enableCaching: boolean
  cacheTTL: number
  rateLimiting: {
    enabled: boolean
    windowMs: number
    maxRequests: number
  }
  auth: {
    required: boolean
    tokenRefreshEnabled: boolean
    sessionTimeout: number
  }
  features: {
    streaming: boolean
    webhooks: boolean
    bulkOperations: boolean
    realTimeCollaboration: boolean
  }
}

// Development configuration
export const developmentConfig: APIEnvironmentConfig = {
  name: 'development',
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  enableLogging: true,
  enableMetrics: false,
  enableCaching: true,
  cacheTTL: 300000, // 5 minutes
  rateLimiting: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 100
  },
  auth: {
    required: true,
    tokenRefreshEnabled: true,
    sessionTimeout: 3600000 // 1 hour
  },
  features: {
    streaming: true,
    webhooks: true,
    bulkOperations: true,
    realTimeCollaboration: true
  }
}

// Staging configuration
export const stagingConfig: APIEnvironmentConfig = {
  ...developmentConfig,
  name: 'staging',
  baseURL: 'https://staging-api.cin7-ai-playground.com/v1',
  enableLogging: true,
  enableMetrics: true,
  rateLimiting: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100
  }
}

// Production configuration
export const productionConfig: APIEnvironmentConfig = {
  ...stagingConfig,
  name: 'production',
  baseURL: 'https://api.cin7-ai-playground.com/v1',
  timeout: 20000,
  enableLogging: true,
  enableMetrics: true,
  enableCaching: true,
  cacheTTL: 600000, // 10 minutes
  rateLimiting: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100
  },
  auth: {
    required: true,
    tokenRefreshEnabled: true,
    sessionTimeout: 1800000 // 30 minutes
  }
}

// Test configuration
export const testConfig: APIEnvironmentConfig = {
  ...developmentConfig,
  name: 'test',
  baseURL: 'http://localhost:3001/api/v1',
  timeout: 5000,
  retries: 1,
  enableLogging: false,
  enableMetrics: false,
  enableCaching: false,
  rateLimiting: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 1000
  }
}

// Get configuration based on environment
export function getAPIConfig(): APIEnvironmentConfig {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      return productionConfig
    case 'test':
      return testConfig
    case 'staging':
      return stagingConfig
    default:
      return developmentConfig
  }
}

// Default API configuration for client
export const defaultAPIConfig: APIConfig = {
  baseURL: getAPIConfig().baseURL,
  timeout: getAPIConfig().timeout,
  retries: getAPIConfig().retries,
  retryDelay: getAPIConfig().retryDelay,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// Environment-specific configuration export
export const config = getAPIConfig()

// Feature flags
export const featureFlags = {
  // API features
  enableStreaming: config.features.streaming,
  enableWebhooks: config.features.webhooks,
  enableBulkOperations: config.features.bulkOperations,
  enableRealTimeCollaboration: config.features.realTimeCollaboration,

  // Development features
  enableDebugMode: config.name === 'development',
  enableMockData: config.name === 'test',
  enableVerboseLogging: config.name !== 'production',

  // Experimental features (disabled by default)
  enableExperimentalAI: false,
  enableAdvancedAnalytics: false,
  enableBetaFeatures: false
}

// API versioning
export const apiVersions = {
  current: 'v1',
  supported: ['v1'],
  deprecated: [],
  sunset: []
}

// Rate limiting configurations
export const rateLimitConfigs = {
  // General API limits
  default: {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  },
  // Authentication endpoints
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5
  },
  // AI endpoints (more restrictive)
  ai: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  },
  // File operations
  files: {
    windowMs: 60000, // 1 minute
    maxRequests: 20
  },
  // Search endpoints
  search: {
    windowMs: 60000, // 1 minute
    maxRequests: 30
  },
  // Admin endpoints (more restrictive)
  admin: {
    windowMs: 60000, // 1 minute
    maxRequests: 50
  }
}

// Cache configurations
export const cacheConfigs = {
  // Default cache TTL (milliseconds)
  default: 300000, // 5 minutes
  // User data (longer cache)
  user: 600000, // 10 minutes
  // Project data
  project: 300000, // 5 minutes
  // AI responses (shorter cache)
  ai: 60000, // 1 minute
  // Templates (longer cache)
  templates: 1800000, // 30 minutes
  // Static data (longest cache)
  static: 3600000 // 1 hour
}

// Error reporting configuration
export const errorReporting = {
  enabled: config.name !== 'development',
  dsn: process.env.SENTRY_DSN,
  environment: config.name,
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: config.name === 'production' ? 0.1 : 1.0
}

// Monitoring configuration
export const monitoring = {
  enabled: config.enableMetrics,
  metricsEndpoint: process.env.METRICS_ENDPOINT,
  healthCheckInterval: 30000, // 30 seconds
  performanceThresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 0.05, // 5%
    memoryUsage: 0.8 // 80%
  }
}

// Security configuration
export const security = {
  // CORS configuration
  cors: {
    enabled: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    maxAge: 86400 // 24 hours
  },
  // Rate limiting
  rateLimiting: config.rateLimiting,
  // Request size limits
  limits: {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxBatchSize: 100
  },
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiration: config.auth.sessionTimeout,
    refreshExpiration: config.auth.sessionTimeout * 24 // 24x session timeout
  }
}

// Database configuration
export const database = {
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  // Query timeouts
  timeouts: {
    default: 5000, // 5 seconds
    complex: 30000, // 30 seconds
    batch: 60000 // 1 minute
  }
}

// External services configuration
export const externalServices = {
  // AI service
  ai: {
    baseURL: process.env.AI_SERVICE_URL || 'http://localhost:8080',
    timeout: 30000,
    retries: 3,
    apiKey: process.env.AI_SERVICE_API_KEY
  },
  // File storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    bucket: process.env.STORAGE_BUCKET || 'cin7-ai-playground',
    region: process.env.STORAGE_REGION || 'us-east-1',
    timeout: 30000
  },
  // Email service
  email: {
    provider: process.env.EMAIL_PROVIDER || 'resend',
    apiKey: process.env.EMAIL_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@cin7-ai-playground.com'
  },
  // Webhook service
  webhooks: {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    maxPayloadSize: 1024 * 1024 // 1MB
  }
}

// Configuration validation
export function validateConfig(): boolean {
  const requiredEnvVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
    return false
  }

  if (config.name === 'production') {
    const productionVars = [
      'JWT_SECRET',
      'SENTRY_DSN'
    ]

    const missingProductionVars = productionVars.filter(varName => !process.env[varName])

    if (missingProductionVars.length > 0) {
      console.warn(`Missing recommended production variables: ${missingProductionVars.join(', ')}`)
    }
  }

  return true
}

// Export default configuration
export default config