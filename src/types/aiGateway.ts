// AI Gateway Service Type Definitions
// Enterprise-grade AI service management for CIN7 AI Playground

import { MessageMetadata, MediaMetadata } from './index'

export interface AIGatewayConfig {
  // Core Configuration
  providers: AIProviderConfig[]
  defaultProvider: string
  timeout: number
  retryAttempts: number
  retryDelay: number

  // Caching Configuration
  cache: CacheConfig

  // Rate Limiting Configuration
  rateLimiting: RateLimitConfig

  // Monitoring Configuration
  monitoring: MonitoringConfig

  // Health Check Configuration
  healthCheck: HealthCheckConfig

  // Feature Flags
  features: GatewayFeatures
}

export interface AIProviderConfig {
  id: string
  name: string
  type: AIProviderType
  enabled: boolean
  priority: number
  config: ProviderSpecificConfig
  rateLimit?: ProviderRateLimit
  costConfig?: ProviderCostConfig
  healthCheck?: ProviderHealthCheck
}

export type AIProviderType = 'glm' | 'openai' | 'anthropic' | 'azure' | 'custom'

export interface ProviderSpecificConfig {
  // GLM Configuration
  apiKey?: string
  baseURL?: string
  model?: string

  // OpenAI Configuration
  organizationId?: string
  maxTokens?: number
  temperature?: number

  // Common Configuration
  timeout?: number
  maxRetries?: number

  // Custom provider configuration
  [key: string]: any
}

export interface ProviderRateLimit {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  tokensPerMinute: number
  tokensPerDay: number
}

export interface ProviderCostConfig {
  inputTokenCost: number
  outputTokenCost: number
  requestCost: number
  currency: string
}

export interface ProviderHealthCheck {
  endpoint: string
  interval: number
  timeout: number
  healthyThreshold: number
  unhealthyThreshold: number
}

// Request/Response Types
export interface AIGatewayRequest {
  id: string
  provider: string
  model: string
  messages: AIMessage[]
  context?: RequestContext
  options?: RequestOptions
  metadata?: RequestMetadata
  timestamp: number
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: MessageMetadata
}

export interface RequestContext {
  projectId?: string
  userId?: string
  sessionId?: string
  framework?: string
  template?: string
  architecture?: string
  constraints?: string[]
  examples?: Example[]
}

export interface Example {
  description: string
  code: string
  language: string
}

export interface RequestOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  stream?: boolean
  responseFormat?: 'text' | 'json_object' | 'markdown'
}

export interface RequestMetadata {
  source: 'web' | 'api' | 'cli'
  userAgent?: string
  ipAddress?: string
  correlationId?: string
  tags?: string[]
}

export interface AIGatewayResponse {
  id: string
  requestId: string
  provider: string
  model: string
  content: string
  finishReason?: string
  usage: TokenUsage
  metadata: ResponseMetadata
  timestamp: number
  cached: boolean
  processingTime: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ResponseMetadata {
  requestId: string
  providerResponseId?: string
  model: string
  processingTime: number
  queueTime?: number
  cost?: number
  cached: boolean
  error?: string
}

// Streaming Types
export interface AIGatewayStreamRequest extends AIGatewayRequest {
  options: RequestOptions & { stream: true }
}

export interface AIGatewayStreamChunk {
  id: string
  requestId: string
  content: string
  delta: string
  finishReason?: string
  usage?: Partial<TokenUsage>
  timestamp: number
}

export interface AIGatewayStreamResponse {
  requestId: string
  provider: string
  model: string
  chunks: AIGatewayStreamChunk[]
  finalUsage?: TokenUsage
  metadata: ResponseMetadata
}

// Caching Types
export interface CacheConfig {
  enabled: boolean
  ttl: number
  maxSize: number
  strategy: CacheStrategy
  storage: CacheStorage
  keyGenerator: CacheKeyGenerator
}

export type CacheStrategy = 'lru' | 'lfu' | 'ttl' | 'adaptive'

export interface CacheStorage {
  type: 'memory' | 'redis' | 'localstorage'
  config: StorageConfig
}

export interface StorageConfig {
  // Memory Storage
  maxSize?: number

  // Redis Storage
  host?: string
  port?: number
  password?: string
  db?: number

  // Local Storage
  prefix?: string
}

export interface CacheKeyGenerator {
  algorithm: 'sha256' | 'md5' | 'custom'
  includeContext: boolean
  includeOptions: boolean
  customFunction?: (request: AIGatewayRequest) => string
}

export interface CacheEntry {
  key: string
  request: AIGatewayRequest
  response: AIGatewayResponse
  timestamp: number
  ttl: number
  hitCount: number
}

// Rate Limiting Types
export interface RateLimitConfig {
  enabled: boolean
  strategy: RateLimitStrategy
  limits: RateLimitRule[]
  storage: RateLimitStorage
}

export type RateLimitStrategy = 'sliding-window' | 'fixed-window' | 'token-bucket' | 'adaptive'

export interface RateLimitRule {
  id: string
  name: string
  window: number
  limit: number
  scope: RateLimitScope
  conditions?: RateLimitCondition[]
}

export type RateLimitScope = 'global' | 'user' | 'project' | 'session' | 'ip'

export interface RateLimitCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin'
  value: any
}

export interface RateLimitStorage {
  type: 'memory' | 'redis' | 'database'
  config: any
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  ruleId: string
}

// Monitoring Types
export interface MonitoringConfig {
  enabled: boolean
  metrics: MetricsConfig
  logging: LoggingConfig
  tracing: TracingConfig
  alerts: AlertConfig
}

export interface MetricsConfig {
  enabled: boolean
  interval: number
  retention: number
  export: MetricsExport
}

export interface MetricsExport {
  type: 'prometheus' | 'datadog' | 'custom'
  config: any
}

export interface LoggingConfig {
  level: LogLevel
  format: LogFormat
  outputs: LogOutput[]
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogFormat = 'json' | 'text' | 'structured'

export interface LogOutput {
  type: 'console' | 'file' | 'remote'
  config: any
}

export interface TracingConfig {
  enabled: boolean
  sampling: number
  export: TracingExport
}

export interface TracingExport {
  type: 'jaeger' | 'zipkin' | 'custom'
  config: any
}

export interface AlertConfig {
  enabled: boolean
  rules: AlertRule[]
  channels: AlertChannel[]
}

export interface AlertRule {
  id: string
  name: string
  condition: string
  threshold: number
  severity: AlertSeverity
  cooldown: number
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms'
  config: any
}

// Health Check Types
export interface HealthCheckConfig {
  enabled: boolean
  interval: number
  timeout: number
  retries: number
  endpoints: HealthCheckEndpoint[]
}

export interface HealthCheckEndpoint {
  id: string
  name: string
  url: string
  method: string
  headers: Record<string, string>
  body?: any
  expectedStatus: number
  timeout: number
  interval: number
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: HealthCheckResult[]
  timestamp: number
}

export interface HealthCheckResult {
  endpoint: string
  status: 'pass' | 'fail' | 'warn'
  responseTime: number
  error?: string
  timestamp: number
}

// Feature Flags
export interface GatewayFeatures {
  caching: boolean
  rateLimiting: boolean
  monitoring: boolean
  healthChecks: boolean
  streaming: boolean
  multiProvider: boolean
  loadBalancing: boolean
  circuitBreaker: boolean
  requestDeduplication: boolean
  costOptimization: boolean
}

// Load Balancing Types
export interface LoadBalancerConfig {
  enabled: boolean
  strategy: LoadBalancerStrategy
  healthCheck: boolean
  stickySessions: boolean
}

export type LoadBalancerStrategy = 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'response-time' | 'custom'

// Circuit Breaker Types
export interface CircuitBreakerConfig {
  enabled: boolean
  threshold: number
  timeout: number
  resetTimeout: number
  monitor: string
}

// Error Types
export interface AIGatewayError {
  code: ErrorCode
  message: string
  details?: any
  timestamp: number
  requestId?: string
  provider?: string
}

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'CACHE_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_AVAILABLE'
  | 'CONTENT_FILTERED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'STREAM_ERROR'

// Analytics Types
export interface AIGatewayAnalytics {
  requests: RequestAnalytics
  responses: ResponseAnalytics
  performance: PerformanceAnalytics
  costs: CostAnalytics
  errors: ErrorAnalytics
}

export interface RequestAnalytics {
  total: number
  successful: number
  failed: number
  byProvider: Record<string, number>
  byModel: Record<string, number>
  byUser: Record<string, number>
  byProject: Record<string, number>
}

export interface ResponseAnalytics {
  averageTokens: number
  totalTokens: number
  averageResponseTime: number
  cachedResponses: number
  cacheHitRate: number
}

export interface PerformanceAnalytics {
  p50: number
  p95: number
  p99: number
  averageResponseTime: number
  throughput: number
  errorRate: number
}

export interface CostAnalytics {
  totalCost: number
  costByProvider: Record<string, number>
  costByModel: Record<string, number>
  costByUser: Record<string, number>
  averageCostPerRequest: number
}

export interface ErrorAnalytics {
  totalErrors: number
  errorsByCode: Record<ErrorCode, number>
  errorsByProvider: Record<string, number>
  errorsByType: Record<string, number>
}

// Default Configurations
export const DEFAULT_AI_GATEWAY_CONFIG: Partial<AIGatewayConfig> = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    strategy: 'lru',
    storage: {
      type: 'memory',
      config: {}
    },
    keyGenerator: {
      algorithm: 'sha256',
      includeContext: true,
      includeOptions: true
    }
  },
  rateLimiting: {
    enabled: true,
    strategy: 'sliding-window',
    limits: [
      {
        id: 'default',
        name: 'Default Rate Limit',
        window: 60000, // 1 minute
        limit: 100,
        scope: 'user'
      }
    ],
    storage: {
      type: 'memory',
      config: {}
    }
  },
  monitoring: {
    enabled: true,
    metrics: {
      enabled: true,
      interval: 60000, // 1 minute
      retention: 86400000, // 24 hours
      export: {
        type: 'prometheus',
        config: {}
      }
    },
    logging: {
      level: 'info',
      format: 'json',
      outputs: [
        {
          type: 'console',
          config: {}
        }
      ]
    },
    tracing: {
      enabled: false,
      sampling: 0.1,
      export: {
        type: 'jaeger',
        config: {}
      }
    },
    alerts: {
      enabled: false,
      rules: [],
      channels: []
    }
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,
    retries: 3,
    endpoints: []
  },
  features: {
    caching: true,
    rateLimiting: true,
    monitoring: true,
    healthChecks: true,
    streaming: true,
    multiProvider: true,
    loadBalancing: true,
    circuitBreaker: true,
    requestDeduplication: true,
    costOptimization: true
  }
}