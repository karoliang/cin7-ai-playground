import { AIGatewayConfig, AIProviderConfig, DEFAULT_AI_GATEWAY_CONFIG } from '@/types/aiGateway'
import { validateGLMConfig, createGLMConfigFromEnv } from '@/services/glmService'

/**
 * AI Gateway Configuration Manager
 * Handles loading, validation, and management of AI Gateway configuration
 */
export class AIGatewayConfigManager {
  private static instance: AIGatewayConfigManager
  private config: AIGatewayConfig | null = null
  private configSource: 'env' | 'file' | 'remote' | 'memory' = 'env'
  private lastUpdated: number = 0
  private watchers: Array<(config: AIGatewayConfig) => void> = []

  private constructor() {}

  static getInstance(): AIGatewayConfigManager {
    if (!AIGatewayConfigManager.instance) {
      AIGatewayConfigManager.instance = new AIGatewayConfigManager()
    }
    return AIGatewayConfigManager.instance
  }

  /**
   * Initialize configuration from environment variables
   */
  async initialize(): Promise<AIGatewayConfig> {
    try {
      this.config = await this.loadFromEnvironment()
      this.configSource = 'env'
      this.lastUpdated = Date.now()

      this.validateConfig(this.config)
      this.notifyWatchers()

      console.log('[AI Gateway] Configuration initialized from environment')
      return this.config
    } catch (error) {
      console.error('[AI Gateway] Failed to initialize configuration:', error)
      throw error
    }
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<AIGatewayConfig> {
    const env = import.meta.env as any

    // Provider configuration
    const providers = this.buildProvidersFromEnv(env)

    if (providers.length === 0) {
      throw new Error('At least one AI provider must be configured')
    }

    const defaultProvider = env.VITE_AI_GATEWAY_DEFAULT_PROVIDER || providers[0].id

    return {
      providers,
      defaultProvider,
      timeout: parseInt(env.VITE_AI_GATEWAY_TIMEOUT || '30000'),
      retryAttempts: parseInt(env.VITE_AI_GATEWAY_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(env.VITE_AI_GATEWAY_RETRY_DELAY || '1000'),

      // Cache configuration
      cache: {
        enabled: env.VITE_AI_GATEWAY_CACHE_ENABLED !== 'false',
        ttl: parseInt(env.VITE_AI_GATEWAY_CACHE_TTL || '300000'),
        maxSize: parseInt(env.VITE_AI_GATEWAY_CACHE_MAX_SIZE || '1000'),
        strategy: (env.VITE_AI_GATEWAY_CACHE_STRATEGY as any) || 'lru',
        storage: {
          type: (env.VITE_AI_GATEWAY_CACHE_STORAGE as any) || 'memory',
          config: this.parseCacheStorageConfig(env)
        },
        keyGenerator: {
          algorithm: (env.VITE_AI_GATEWAY_CACHE_KEY_ALGORITHM as any) || 'sha256',
          includeContext: env.VITE_AI_GATEWAY_CACHE_INCLUDE_CONTEXT !== 'false',
          includeOptions: env.VITE_AI_GATEWAY_CACHE_INCLUDE_OPTIONS !== 'false'
        }
      },

      // Rate limiting configuration
      rateLimiting: {
        enabled: env.VITE_AI_GATEWAY_RATE_LIMIT_ENABLED !== 'false',
        strategy: (env.VITE_AI_GATEWAY_RATE_LIMIT_STRATEGY as any) || 'sliding-window',
        limits: this.buildRateLimitsFromEnv(env),
        storage: {
          type: (env.VITE_AI_GATEWAY_RATE_LIMIT_STORAGE as any) || 'memory',
          config: this.parseRateLimitStorageConfig(env)
        }
      },

      // Monitoring configuration
      monitoring: {
        enabled: env.VITE_AI_GATEWAY_MONITORING_ENABLED !== 'false',
        metrics: {
          enabled: env.VITE_AI_GATEWAY_METRICS_ENABLED !== 'false',
          interval: parseInt(env.VITE_AI_GATEWAY_METRICS_INTERVAL || '60000'),
          retention: parseInt(env.VITE_AI_GATEWAY_METRICS_RETENTION || '86400000'),
          export: {
            type: (env.VITE_AI_GATEWAY_METRICS_EXPORT as any) || 'prometheus',
            config: this.parseMetricsExportConfig(env)
          }
        },
        logging: {
          level: (env.VITE_AI_GATEWAY_LOG_LEVEL as any) || 'info',
          format: (env.VITE_AI_GATEWAY_LOG_FORMAT as any) || 'json',
          outputs: this.buildLogOutputsFromEnv(env)
        },
        tracing: {
          enabled: env.VITE_AI_GATEWAY_TRACING_ENABLED === 'true',
          sampling: parseFloat(env.VITE_AI_GATEWAY_TRACING_SAMPLING || '0.1'),
          export: {
            type: (env.VITE_AI_GATEWAY_TRACING_EXPORT as any) || 'jaeger',
            config: this.parseTracingExportConfig(env)
          }
        },
        alerts: {
          enabled: env.VITE_AI_GATEWAY_ALERTS_ENABLED === 'true',
          rules: [],
          channels: []
        }
      },

      // Health check configuration
      healthCheck: {
        enabled: env.VITE_AI_GATEWAY_HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(env.VITE_AI_GATEWAY_HEALTH_CHECK_INTERVAL || '30000'),
        timeout: parseInt(env.VITE_AI_GATEWAY_HEALTH_CHECK_TIMEOUT || '5000'),
        retries: parseInt(env.VITE_AI_GATEWAY_HEALTH_CHECK_RETRIES || '3'),
        endpoints: this.buildHealthCheckEndpointsFromEnv(env)
      },

      // Feature flags
      features: {
        caching: env.VITE_AI_GATEWAY_FEATURE_CACHING !== 'false',
        rateLimiting: env.VITE_AI_GATEWAY_FEATURE_RATE_LIMITING !== 'false',
        monitoring: env.VITE_AI_GATEWAY_FEATURE_MONITORING !== 'false',
        healthChecks: env.VITE_AI_GATEWAY_FEATURE_HEALTH_CHECKS !== 'false',
        streaming: env.VITE_AI_GATEWAY_FEATURE_STREAMING !== 'false',
        multiProvider: env.VITE_AI_GATEWAY_FEATURE_MULTI_PROVIDER !== 'false',
        loadBalancing: env.VITE_AI_GATEWAY_FEATURE_LOAD_BALANCING !== 'false',
        circuitBreaker: env.VITE_AI_GATEWAY_FEATURE_CIRCUIT_BREAKER !== 'false',
        requestDeduplication: env.VITE_AI_GATEWAY_FEATURE_REQUEST_DEDUPPLICATION !== 'false',
        costOptimization: env.VITE_AI_GATEWAY_FEATURE_COST_OPTIMIZATION !== 'false'
      }
    }
  }

  /**
   * Build providers configuration from environment variables
   */
  private buildProvidersFromEnv(env: any): AIProviderConfig[] {
    const providers: AIProviderConfig[] = []

    // GLM Provider
    if (env.VITE_GLM_API_KEY) {
      try {
        const glmConfig = createGLMConfigFromEnv()
        const validationErrors = validateGLMConfig(glmConfig)

        if (validationErrors.length === 0) {
          providers.push({
            id: 'glm',
            name: 'GLM (ZhipuAI)',
            type: 'glm',
            enabled: true,
            priority: parseInt(env.VITE_GLM_PRIORITY || '1'),
            config: {
              apiKey: glmConfig.apiKey,
              baseURL: glmConfig.baseURL,
              model: env.VITE_GLM_DEFAULT_MODEL || 'glm-4',
              timeout: glmConfig.timeout,
              maxRetries: glmConfig.retryAttempts
            },
            rateLimit: {
              requestsPerMinute: parseInt(env.VITE_GLM_RATE_LIMIT_RPM || '60'),
              requestsPerHour: parseInt(env.VITE_GLM_RATE_LIMIT_RPH || '1000'),
              requestsPerDay: parseInt(env.VITE_GLM_RATE_LIMIT_RPD || '10000'),
              tokensPerMinute: parseInt(env.VITE_GLM_RATE_LIMIT_TPM || '40000'),
              tokensPerDay: parseInt(env.VITE_GLM_RATE_LIMIT_TPD || '1000000')
            },
            costConfig: {
              inputTokenCost: parseFloat(env.VITE_GLM_COST_INPUT_TOKEN || '0.001'),
              outputTokenCost: parseFloat(env.VITE_GLM_COST_OUTPUT_TOKEN || '0.002'),
              requestCost: parseFloat(env.VITE_GLM_COST_REQUEST || '0'),
              currency: env.VITE_GLM_COST_CURRENCY || 'USD'
            },
            healthCheck: {
              endpoint: env.VITE_GLM_HEALTH_CHECK_ENDPOINT || '/api/health',
              interval: parseInt(env.VITE_GLM_HEALTH_CHECK_INTERVAL || '30000'),
              timeout: parseInt(env.VITE_GLM_HEALTH_CHECK_TIMEOUT || '5000'),
              healthyThreshold: parseInt(env.VITE_GLM_HEALTH_CHECK_HEALTHY_THRESHOLD || '2'),
              unhealthyThreshold: parseInt(env.VITE_GLM_HEALTH_CHECK_UNHEALTHY_THRESHOLD || '3')
            }
          })
        } else {
          console.warn('[AI Gateway] GLM provider configuration errors:', validationErrors)
        }
      } catch (error) {
        console.warn('[AI Gateway] Failed to configure GLM provider:', error)
      }
    }

    // OpenAI Provider (future support)
    if (env.VITE_OPENAI_API_KEY) {
      providers.push({
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        enabled: env.VITE_OPENAI_ENABLED !== 'false',
        priority: parseInt(env.VITE_OPENAI_PRIORITY || '2'),
        config: {
          apiKey: env.VITE_OPENAI_API_KEY,
          organizationId: env.VITE_OPENAI_ORG_ID,
          baseURL: env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
          model: env.VITE_OPENAI_DEFAULT_MODEL || 'gpt-4'
        }
      })
    }

    // Custom providers can be added here
    return providers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Build rate limit rules from environment variables
   */
  private buildRateLimitsFromEnv(env: any) {
    const limits = []

    // Default rate limit
    limits.push({
      id: 'default',
      name: 'Default Rate Limit',
      window: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_WINDOW || '60000'),
      limit: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT || '100'),
      scope: (env.VITE_AI_GATEWAY_RATE_LIMIT_SCOPE as any) || 'user'
    })

    // Anonymous user rate limit
    if (env.VITE_AI_GATEWAY_RATE_LIMIT_ANONYMOUS) {
      limits.push({
        id: 'anonymous',
        name: 'Anonymous User Rate Limit',
        window: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_ANONYMOUS_WINDOW || '60000'),
        limit: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_ANONYMOUS || '20'),
        scope: 'ip' as const
      })
    }

    // Premium user rate limit
    if (env.VITE_AI_GATEWAY_RATE_LIMIT_PREMIUM) {
      limits.push({
        id: 'premium',
        name: 'Premium User Rate Limit',
        window: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_PREMIUM_WINDOW || '60000'),
        limit: parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_PREMIUM || '500'),
        scope: 'user' as const,
        conditions: [
          {
            field: 'user.tier',
            operator: 'eq' as const,
            value: 'premium'
          }
        ]
      })
    }

    return limits
  }

  /**
   * Build log outputs from environment variables
   */
  private buildLogOutputsFromEnv(env: any) {
    const outputs = []

    // Console output (always enabled)
    outputs.push({
      type: 'console' as const,
      config: {}
    })

    // File output
    if (env.VITE_AI_GATEWAY_LOG_FILE) {
      outputs.push({
        type: 'file' as const,
        config: {
          path: env.VITE_AI_GATEWAY_LOG_FILE,
          maxSize: env.VITE_AI_GATEWAY_LOG_FILE_MAX_SIZE || '10MB',
          maxFiles: parseInt(env.VITE_AI_GATEWAY_LOG_FILE_MAX_FILES || '5')
        }
      })
    }

    // Remote output
    if (env.VITE_AI_GATEWAY_LOG_REMOTE_URL) {
      outputs.push({
        type: 'remote' as const,
        config: {
          url: env.VITE_AI_GATEWAY_LOG_REMOTE_URL,
          apiKey: env.VITE_AI_GATEWAY_LOG_REMOTE_API_KEY,
          batchSize: parseInt(env.VITE_AI_GATEWAY_LOG_REMOTE_BATCH_SIZE || '100')
        }
      })
    }

    return outputs
  }

  /**
   * Build health check endpoints from environment variables
   */
  private buildHealthCheckEndpointsFromEnv(env: any) {
    const endpoints = []

    // Default health check endpoint
    if (env.VITE_AI_GATEWAY_HEALTH_CHECK_ENDPOINT) {
      endpoints.push({
        id: 'default',
        name: 'Default Health Check',
        url: env.VITE_AI_GATEWAY_HEALTH_CHECK_ENDPOINT,
        method: 'GET',
        headers: {},
        expectedStatus: 200,
        timeout: parseInt(env.VITE_AI_GATEWAY_HEALTH_CHECK_TIMEOUT || '5000'),
        interval: parseInt(env.VITE_AI_GATEWAY_HEALTH_CHECK_INTERVAL || '30000')
      })
    }

    return endpoints
  }

  /**
   * Parse cache storage configuration
   */
  private parseCacheStorageConfig(env: any) {
    const config: any = {}

    if (env.VITE_AI_GATEWAY_CACHE_TYPE === 'redis') {
      config.host = env.VITE_AI_GATEWAY_CACHE_REDIS_HOST || 'localhost'
      config.port = parseInt(env.VITE_AI_GATEWAY_CACHE_REDIS_PORT || '6379')
      config.password = env.VITE_AI_GATEWAY_CACHE_REDIS_PASSWORD
      config.db = parseInt(env.VITE_AI_GATEWAY_CACHE_REDIS_DB || '0')
    } else if (env.VITE_AI_GATEWAY_CACHE_TYPE === 'localstorage') {
      config.prefix = env.VITE_AI_GATEWAY_CACHE_LOCALSTORAGE_PREFIX || 'ai-gateway-'
    }

    return config
  }

  /**
   * Parse rate limit storage configuration
   */
  private parseRateLimitStorageConfig(env: any) {
    const config: any = {}

    if (env.VITE_AI_GATEWAY_RATE_LIMIT_STORAGE_TYPE === 'redis') {
      config.host = env.VITE_AI_GATEWAY_RATE_LIMIT_REDIS_HOST || 'localhost'
      config.port = parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_REDIS_PORT || '6379')
      config.password = env.VITE_AI_GATEWAY_RATE_LIMIT_REDIS_PASSWORD
      config.db = parseInt(env.VITE_AI_GATEWAY_RATE_LIMIT_REDIS_DB || '1')
    }

    return config
  }

  /**
   * Parse metrics export configuration
   */
  private parseMetricsExportConfig(env: any) {
    const config: any = {}

    if (env.VITE_AI_GATEWAY_METRICS_EXPORT_TYPE === 'prometheus') {
      config.port = parseInt(env.VITE_AI_GATEWAY_METRICS_PROMETHEUS_PORT || '9090')
      config.path = env.VITE_AI_GATEWAY_METRICS_PROMETHEUS_PATH || '/metrics'
    } else if (env.VITE_AI_GATEWAY_METRICS_EXPORT_TYPE === 'datadog') {
      config.apiKey = env.VITE_AI_GATEWAY_METRICS_DATADOG_API_KEY
      config.site = env.VITE_AI_GATEWAY_METRICS_DATADOG_SITE || 'datadoghq.com'
    }

    return config
  }

  /**
   * Parse tracing export configuration
   */
  private parseTracingExportConfig(env: any) {
    const config: any = {}

    if (env.VITE_AI_GATEWAY_TRACING_EXPORT_TYPE === 'jaeger') {
      config.endpoint = env.VITE_AI_GATEWAY_TRACING_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      config.serviceName = env.VITE_AI_GATEWAY_TRACING_SERVICE_NAME || 'ai-gateway'
    } else if (env.VITE_AI_GATEWAY_TRACING_EXPORT_TYPE === 'zipkin') {
      config.endpoint = env.VITE_AI_GATEWAY_TRACING_ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans'
      config.serviceName = env.VITE_AI_GATEWAY_TRACING_SERVICE_NAME || 'ai-gateway'
    }

    return config
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: AIGatewayConfig): void {
    const errors: string[] = []

    // Validate providers
    if (!config.providers || config.providers.length === 0) {
      errors.push('At least one AI provider must be configured')
    }

    // Validate default provider
    if (!config.defaultProvider) {
      errors.push('Default provider must be specified')
    } else {
      const defaultProviderExists = config.providers.some(p => p.id === config.defaultProvider)
      if (!defaultProviderExists) {
        errors.push(`Default provider '${config.defaultProvider}' is not configured`)
      }
    }

    // Validate timeout
    if (config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms')
    }

    // Validate retry attempts
    if (config.retryAttempts < 0 || config.retryAttempts > 10) {
      errors.push('Retry attempts must be between 0 and 10')
    }

    // Validate cache configuration
    if (config.cache.enabled) {
      if (config.cache.ttl < 1000) {
        errors.push('Cache TTL must be at least 1000ms')
      }
      if (config.cache.maxSize < 1) {
        errors.push('Cache max size must be at least 1')
      }
    }

    // Validate rate limiting configuration
    if (config.rateLimiting.enabled) {
      if (!config.rateLimiting.limits || config.rateLimiting.limits.length === 0) {
        errors.push('Rate limiting is enabled but no limits are configured')
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AIGatewayConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.')
    }
    return { ...this.config }
  }

  /**
   * Get provider configuration by ID
   */
  getProviderConfig(providerId: string): AIProviderConfig | null {
    const config = this.getConfig()
    return config.providers.find(p => p.id === providerId) || null
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): AIProviderConfig[] {
    const config = this.getConfig()
    return config.providers.filter(p => p.enabled)
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<AIGatewayConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not initialized')
    }

    this.config = { ...this.config, ...updates }
    this.lastUpdated = Date.now()

    this.validateConfig(this.config)
    this.notifyWatchers()

    console.log('[AI Gateway] Configuration updated')
  }

  /**
   * Add configuration change watcher
   */
  addWatcher(watcher: (config: AIGatewayConfig) => void): void {
    this.watchers.push(watcher)
  }

  /**
   * Remove configuration change watcher
   */
  removeWatcher(watcher: (config: AIGatewayConfig) => void): void {
    const index = this.watchers.indexOf(watcher)
    if (index > -1) {
      this.watchers.splice(index, 1)
    }
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(): void {
    if (this.config) {
      this.watchers.forEach(watcher => {
        try {
          watcher(this.config!)
        } catch (error) {
          console.error('[AI Gateway] Configuration watcher error:', error)
        }
      })
    }
  }

  /**
   * Get configuration metadata
   */
  getMetadata() {
    return {
      source: this.configSource,
      lastUpdated: this.lastUpdated,
      version: '2.0.0',
      environment: import.meta.env.MODE,
      hasConfig: this.config !== null
    }
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): any {
    const config = this.getConfig()
    const metadata = this.getMetadata()

    // Sanitize sensitive data
    const sanitizedConfig = {
      ...config,
      providers: config.providers.map(provider => ({
        ...provider,
        config: this.sanitizeProviderConfig(provider.config)
      }))
    }

    return {
      metadata,
      config: sanitizedConfig
    }
  }

  /**
   * Sanitize provider configuration for export
   */
  private sanitizeProviderConfig(config: any): any {
    const sanitized = { ...config }

    // Remove sensitive fields
    if (sanitized.apiKey) {
      sanitized.apiKey = sanitized.apiKey.substring(0, 8) + '***'
    }
    if (sanitized.password) {
      sanitized.password = '***'
    }

    return sanitized
  }
}

// Export singleton instance
export const aiGatewayConfig = AIGatewayConfigManager.getInstance()

// Export utility functions
export async function initializeAIGatewayConfig(): Promise<AIGatewayConfig> {
  return await aiGatewayConfig.initialize()
}

export function getAIGatewayConfig(): AIGatewayConfig {
  return aiGatewayConfig.getConfig()
}

export function getAIProviderConfig(providerId: string): AIProviderConfig | null {
  return aiGatewayConfig.getProviderConfig(providerId)
}

export function getEnabledAIProviders(): AIProviderConfig[] {
  return aiGatewayConfig.getEnabledProviders()
}