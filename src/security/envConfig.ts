/**
 * Secure Environment Configuration
 * Prevents client-side exposure of sensitive environment variables
 */

export interface ServerConfig {
  // Supabase Configuration (server-side only)
  supabase: {
    url: string
    serviceRoleKey: string
    anonKey: string
  }

  // AI Provider Configuration (server-side only)
  aiProviders: {
    glm: {
      apiKey: string
      baseURL: string
      timeout: number
      retryAttempts: number
    }
    openai?: {
      apiKey: string
      organizationId?: string
      baseURL: string
    }
  }

  // Security Configuration
  security: {
    encryptionKey: string
    jwtSecret: string
    sessionSecret: string
    corsOrigins: string[]
  }

  // Rate Limiting Configuration
  rateLimiting: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
  }
}

/**
 * Server-side environment configuration loader
 * This should only be used on the server side
 */
export class ServerEnvironmentConfig {
  private static config: ServerConfig | null = null

  static load(): ServerConfig {
    if (this.config) {
      return this.config
    }

    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GLM_API_KEY',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'SESSION_SECRET'
    ]

    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is missing`)
      }
    }

    // Validate encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY!
    if (encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)')
    }

    this.config = {
      supabase: {
        url: process.env.SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        anonKey: process.env.SUPABASE_ANON_KEY!
      },

      aiProviders: {
        glm: {
          apiKey: process.env.GLM_API_KEY!,
          baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/',
          timeout: parseInt(process.env.GLM_TIMEOUT || '30000'),
          retryAttempts: parseInt(process.env.GLM_RETRY_ATTEMPTS || '3')
        }
      },

      security: {
        encryptionKey,
        jwtSecret: process.env.JWT_SECRET!,
        sessionSecret: process.env.SESSION_SECRET!,
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
      },

      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true'
      }
    }

    // Add OpenAI configuration if available
    if (process.env.OPENAI_API_KEY) {
      this.config.aiProviders.openai = {
        apiKey: process.env.OPENAI_API_KEY!,
        organizationId: process.env.OPENAI_ORG_ID,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    }

    return this.config
  }

  static get(): ServerConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.')
    }
    return this.config
  }
}

/**
 * Client-safe environment configuration
 * Only includes variables that are safe to expose to the client
 */
export interface ClientConfig {
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
  }

  supabase: {
    url: string
    anonKey: string
  }

  features: {
    enableAnalytics: boolean
    enableCollaboration: boolean
    enableTemplates: boolean
    enableAIGeneration: boolean
  }

  limits: {
    maxPromptLength: number
    maxTokens: number
    maxFileSize: number
  }
}

/**
 * Client-safe environment configuration
 */
export class ClientEnvironmentConfig {
  private static config: ClientConfig | null = null

  static load(): ClientConfig {
    if (this.config) {
      return this.config
    }

    this.config = {
      app: {
        name: import.meta.env.VITE_APP_NAME || 'CIN7 AI Playground',
        version: import.meta.env.VITE_APP_VERSION || '2.0.0',
        environment: (import.meta.env.MODE as 'development' | 'staging' | 'production') || 'development'
      },

      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || '',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      },

      features: {
        enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
        enableCollaboration: import.meta.env.VITE_ENABLE_COLLABORATION === 'true',
        enableTemplates: import.meta.env.VITE_ENABLE_TEMPLATES === 'true',
        enableAIGeneration: import.meta.env.VITE_ENABLE_AI_GENERATION !== 'false'
      },

      limits: {
        maxPromptLength: parseInt(import.meta.env.VITE_MAX_PROMPT_LENGTH || '50000'),
        maxTokens: parseInt(import.meta.env.VITE_MAX_TOKENS || '4000'),
        maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760') // 10MB
      }
    }

    return this.config
  }

  static get(): ClientConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.')
    }
    return this.config
  }
}

/**
 * Environment validation utilities
 */
export class EnvironmentValidator {
  /**
   * Validate server environment
   */
  static validateServer(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for required environment variables
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GLM_API_KEY',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'SESSION_SECRET'
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    }

    // Validate URLs
    if (process.env.SUPABASE_URL) {
      try {
        new URL(process.env.SUPABASE_URL)
      } catch {
        errors.push('Invalid SUPABASE_URL format')
      }
    }

    // Validate encryption key
    if (process.env.ENCRYPTION_KEY) {
      const key = process.env.ENCRYPTION_KEY
      if (key.length !== 64) {
        errors.push('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)')
      }
      if (!/^[0-9a-fA-F]+$/.test(key)) {
        errors.push('ENCRYPTION_KEY must be a valid hexadecimal string')
      }
    }

    // Validate numeric values
    const numericVars = [
      'GLM_TIMEOUT',
      'GLM_RETRY_ATTEMPTS',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS'
    ]

    for (const varName of numericVars) {
      const value = process.env[varName]
      if (value && isNaN(parseInt(value))) {
        errors.push(`${varName} must be a valid number`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate client environment
   */
  static validateClient(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for required client variables
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ]

    for (const varName of requiredVars) {
      if (!import.meta.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    }

    // Validate URLs
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        new URL(import.meta.env.VITE_SUPABASE_URL)
      } catch {
        errors.push('Invalid VITE_SUPABASE_URL format')
      }
    }

    // Check for client-side API keys (security issue)
    const forbiddenVars = [
      'VITE_GLM_API_KEY',
      'VITE_OPENAI_API_KEY',
      'VITE_SUPABASE_SERVICE_ROLE_KEY'
    ]

    for (const varName of forbiddenVars) {
      if (import.meta.env[varName]) {
        errors.push(`Security risk: ${varName} should not be exposed to client-side`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Security utilities for environment variables
 */
export class EnvironmentSecurity {
  /**
   * Check if running on server side
   */
  static isServer(): boolean {
    return typeof window === 'undefined'
  }

  /**
   * Check if running on client side
   */
  static isClient(): boolean {
    return typeof window !== 'undefined'
  }

  /**
   * Get safe environment variable
   */
  static getSafeEnv(key: string, defaultValue?: string): string | undefined {
    if (this.isServer()) {
      return process.env[key] || defaultValue
    } else {
      // Only allow VITE_ prefixed variables on client side
      if (!key.startsWith('VITE_')) {
        console.warn(`Security: Attempted to access non-VITE environment variable on client: ${key}`)
        return undefined
      }

      // Check for forbidden patterns
      const forbiddenPatterns = [
        /API_KEY/i,
        /SECRET/i,
        /PASSWORD/i,
        /TOKEN/i,
        /PRIVATE/i
      ]

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(key)) {
          console.warn(`Security: Attempted to access sensitive environment variable on client: ${key}`)
          return undefined
        }
      }

      return import.meta.env[key] || defaultValue
    }
  }
}