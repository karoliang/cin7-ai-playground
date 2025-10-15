// GLM (ZhipuAI) Service Types for CIN7 AI Playground

export interface GLMConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface GLMMessage {
  role: GLMMessageRole
  content: string
  name?: string
  tool_calls?: GLMToolCall[]
}

export type GLMMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface GLMToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface GLMTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: Record<string, any>
    strict?: boolean
  }
}

export interface GLMChatCompletionRequest {
  model: GLMModel
  messages: GLMMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  stop?: string | string[]
  tools?: GLMTool[]
  tool_choice?: 'auto' | 'required' | 'none'
  response_format?: GLMResponseFormat
  user?: string
}

export interface GLMResponseFormat {
  type: 'text' | 'json_object' | 'json_schema'
  json_schema?: {
    name: string
    description?: string
    schema: Record<string, any>
    strict?: boolean
  }
}

export interface GLMChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: GLMModel
  choices: GLMChoice[]
  usage: GLMUsage
  system_fingerprint?: string
}

export interface GLMChoice {
  index: number
  message: GLMMessage
  finish_reason: GLMFinishReason
  logprobs?: GLMLogProbs
}

export interface GLMLogProbs {
  content: GLMLogProbInfo[]
}

export interface GLMLogProbInfo {
  token: string
  logprob: number
  bytes: number[]
  top_logprobs: Array<{
    token: string
    logprob: number
    bytes: number[]
  }>
}

export interface GLMUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  completion_tokens_details?: {
    reasoning_tokens: number
  }
}

export type GLMFinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | 'function_call'

export type GLMModel =
  | 'glm-4-plus'
  | 'glm-4-0520'
  | 'glm-4'
  | 'glm-4-air'
  | 'glm-4-airx'
  | 'glm-4-long'
  | 'glm-4-flashx'
  | 'glm-4-flash'
  | 'glm-4v-plus'
  | 'glm-4v'
  | 'glm-3-turbo'

export interface GLMError {
  error: {
    message: string
    type: string
    param?: string
    code?: string | number
  }
}

export interface GLMStreamChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: GLMModel
  choices: GLMStreamChoice[]
  system_fingerprint?: string
}

export interface GLMStreamChoice {
  index: number
  delta: {
    role?: GLMMessageRole
    content?: string
    tool_calls?: GLMToolCall[]
  }
  finish_reason?: GLMFinishReason
  logprobs?: GLMLogProbs
}

export interface GLMServiceOptions {
  enableLogging?: boolean
  enableCaching?: boolean
  cacheTimeout?: number
  customHeaders?: Record<string, string>
}

export interface GLMCodeGenerationRequest {
  prompt: string
  context?: string
  language?: string
  framework?: string
  existing_code?: string
  requirements?: string[]
  constraints?: string[]
}

export interface GLMCodeGenerationResponse {
  code: string
  explanation?: string
  file_path?: string
  language?: string
  confidence?: number
  warnings?: string[]
  suggestions?: string[]
}

export interface GLMContextualUpdateRequest {
  current_code: string
  update_request: string
  file_path: string
  context?: {
    project_type?: string
    dependencies?: string[]
    related_files?: string[]
  }
}

export interface GLMContextualUpdateResponse {
  updated_code: string
  changes: GLMCodeChange[]
  explanation?: string
  confidence?: number
  warnings?: string[]
}

export interface GLMCodeChange {
  type: 'add' | 'remove' | 'modify'
  line_start?: number
  line_end?: number
  content: string
  description?: string
}

// Service Health and Monitoring
export interface GLMServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms?: number
  last_check: number
  error_rate?: number
  error_message?: string
}

export interface GLMRequestMetrics {
  request_id: string
  timestamp: number
  model: GLMModel
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  latency_ms: number
  success: boolean
  error?: string
}

// Integration Types for CIN7 AI Playground
export interface GLMAIProvider {
  name: 'glm'
  displayName: 'GLM (ZhipuAI)'
  models: GLMModel[]
  defaultModel: GLMModel
  maxTokens: number
  supportedFeatures: GLMSupportedFeature[]
}

export type GLMSupportedFeature =
  | 'chat_completion'
  | 'streaming'
  | 'function_calling'
  | 'json_mode'
  | 'vision'
  | 'code_generation'
  | 'contextual_update'

export interface GLMProviderConfig {
  enabled: boolean
  apiKey: string
  defaultModel: GLMModel
  temperature: number
  maxTokens: number
  timeout: number
  retryAttempts: number
  enableLogging: boolean
}

// Default configurations
export const DEFAULT_GLM_CONFIG: Partial<GLMConfig> = {
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
}

export const DEFAULT_GLM_SERVICE_OPTIONS: GLMServiceOptions = {
  enableLogging: true,
  enableCaching: false,
  cacheTimeout: 300000, // 5 minutes
}

export const GLM_PROVIDER_CONFIG: GLMAIProvider = {
  name: 'glm',
  displayName: 'GLM (ZhipuAI)',
  models: [
    'glm-4-plus',
    'glm-4-0520',
    'glm-4',
    'glm-4-air',
    'glm-4-airx',
    'glm-4-long',
    'glm-4-flashx',
    'glm-4-flash',
    'glm-4v-plus',
    'glm-4v',
    'glm-3-turbo'
  ],
  defaultModel: 'glm-4',
  maxTokens: 128000,
  supportedFeatures: [
    'chat_completion',
    'streaming',
    'function_calling',
    'json_mode',
    'vision',
    'code_generation',
    'contextual_update'
  ]
}