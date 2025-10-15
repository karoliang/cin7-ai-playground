// API request/response types for CIN7 AI Playground

// Base Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  details?: Record<string, any>
  timestamp?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PaginationResponse {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationResponse
}

// Project Types
export interface ProjectListParams extends PaginationParams {
  status?: ProjectStatus
  search?: string
  sort?: 'created_at' | 'updated_at' | 'name'
}

export interface CreateProjectRequest {
  name: string
  description?: string
  prompt?: string
  template?: ProjectTemplate
  framework?: SupportedFramework
  settings?: Partial<ProjectSettings>
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  prompt?: string
  status?: ProjectStatus
  metadata?: Partial<ProjectMetadata>
  settings?: Partial<ProjectSettings>
}

export interface ProjectListResponse {
  projects: Project[]
  pagination: PaginationResponse
}

// AI Types
export interface GenerateRequest {
  prompt: string
  existing_files?: ProjectFile[]
  chat_history?: ChatMessage[]
  context?: RequestContext
  options?: GenerateOptions
}

export interface RequestContext {
  project_id?: string
  framework?: SupportedFramework
  template?: ProjectTemplate
  architecture?: Partial<ProjectArchitecture>
  constraints?: string[]
  examples?: Example[]
}

export interface Example {
  description: string
  code: string
  language: string
}

export interface GenerateOptions {
  temperature?: number
  max_tokens?: number
  stream?: boolean
  include_tests?: boolean
  include_docs?: boolean
}

export interface GenerateResponse {
  success: boolean
  files: ProjectFile[]
  operations: FileOperation[]
  reasoning?: string
  confidence?: number
  build_config?: ProjectBuildConfig
  deployment_config?: DeploymentConfig
  next_steps?: string[]
  warnings?: string[]
}

export interface ChatRequest {
  message: string
  project_id?: string
  context?: Record<string, any>
  stream?: boolean
}

export interface ChatResponse {
  message: string
  role: 'assistant'
  metadata?: MessageMetadata
  suggestions?: string[]
}

export interface AIModel {
  id: string
  name: string
  provider: string
  capabilities: string[]
  max_tokens: number
  cost_per_token: number
  available: boolean
}

export interface AnalyzeRequest {
  code: string
  file_path?: string
  language?: string
  analysis_type?: 'security' | 'performance' | 'quality' | 'suggestions' | 'all'
}

export interface AnalyzeResponse {
  issues: Issue[]
  suggestions: Suggestion[]
  metrics: CodeMetrics
  summary: string
}

export interface Issue {
  type: 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
  severity: string
  fix_suggestion?: string
}

export interface Suggestion {
  type: string
  description: string
  code?: string
  impact: string
}

export interface CodeMetrics {
  complexity: number
  maintainability: string
  test_coverage?: number
  performance_score?: number
}

// File Types
export interface FileListParams {
  type?: FileType
}

export interface CreateFileRequest {
  name: string
  type: FileType
  content: string
  path?: string
}

export interface UpdateFileRequest {
  content: string
  name?: string
}

// User Types
export interface UpdateProfileRequest {
  name?: string
  avatar?: string
}

export interface UpdateSettingsRequest {
  theme?: Partial<ThemeSettings>
  notifications?: {
    email?: boolean
    push?: boolean
    project_updates?: boolean
    ai_suggestions?: boolean
  }
  privacy?: {
    profile_visibility?: 'public' | 'private'
    share_projects?: boolean
  }
  preferences?: {
    language?: string
    timezone?: string
    auto_save?: boolean
  }
}

export interface UserSettings {
  theme: ThemeSettings
  notifications: {
    email: boolean
    push: boolean
    project_updates: boolean
    ai_suggestions: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private'
    share_projects: boolean
  }
  preferences: {
    language: string
    timezone: string
    auto_save: boolean
  }
}

// Error Types
export interface APIError {
  success: false
  error: string
  code: string
  details?: Record<string, any>
  timestamp?: string
}

export interface ValidationError extends APIError {
  details: {
    field: string
    message: string
  }[]
}

export interface RateLimitError extends APIError {
  details: {
    retry_after: number
  }
}

// Re-export types from main index file
export type {
  User,
  Project,
  ProjectFile,
  FileType,
  ChatMessage,
  MessageRole,
  MessageMetadata,
  FileOperation,
  ProjectMetadata,
  ProjectArchitecture,
  PageConfig,
  RoutingConfig,
  RouteConfig,
  ComponentConfig,
  SupportedFramework,
  ProjectTemplate,
  ProjectBuildConfig,
  BuildOptimization,
  DeploymentConfig,
  ProjectSettings,
  ThemeSettings,
  EditorSettings,
  PreviewSettings,
  DeviceType,
  OrientationType,
  PreviewSize,
  AISettings,
  CollaborationSettings,
  PermissionConfig,
  ProjectStatus
} from './index'

// API Endpoint Configuration
export interface APIConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
  headers?: Record<string, string>
}

export interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

// API Client Options
export interface APIClientOptions {
  baseURL?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
  authToken?: string
  onAuthError?: () => void
  onRateLimit?: (retryAfter: number) => void
  onRequest?: (config: RequestConfig) => void
  onResponse?: (response: Response) => void
  onError?: (error: Error) => void
}

// WebSocket Types (for streaming responses)
export interface StreamResponse {
  type: 'data' | 'error' | 'complete'
  data?: any
  error?: string
}

export interface ChatStreamChunk {
  type: 'message' | 'suggestion' | 'metadata'
  content?: string
  suggestions?: string[]
  metadata?: MessageMetadata
}

export interface GenerateStreamChunk {
  type: 'file' | 'operation' | 'reasoning' | 'complete'
  file?: ProjectFile
  operation?: FileOperation
  reasoning?: string
  progress?: number
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: ServiceHealth[]
  version: string
  uptime: number
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy'
  response_time: number
  error?: string
}

// Metrics Types
export interface APIMetrics {
  requests: {
    total: number
    successful: number
    failed: number
    rate_limited: number
  }
  response_times: {
    avg: number
    min: number
    max: number
    p95: number
    p99: number
  }
  endpoints: EndpointMetrics[]
}

export interface EndpointMetrics {
  path: string
  method: string
  requests: number
  avg_response_time: number
  error_rate: number
  status_codes: Record<string, number>
}

// Cache Types
export interface CacheConfig {
  enabled: boolean
  ttl: number
  maxSize: number
  strategy: 'lru' | 'fifo' | 'lfu'
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  expires_at: number
  created_at: number
  accessed_at: number
  hit_count: number
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitInfo {
  limit: number
  current: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

// Authentication Types
export interface AuthTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

// File Upload Types
export interface FileUploadOptions {
  onProgress?: (progress: number) => void
  onSuccess?: (file: ProjectFile) => void
  onError?: (error: Error) => void
  abortSignal?: AbortSignal
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number
  timeRemaining: number
}

// Bulk Operations Types
export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete'
  data: T
  id?: string
}

export interface BulkOperationResult<T> {
  successful: T[]
  failed: {
    data: T
    error: string
  }[]
  total: number
}

// Search Types
export interface SearchParams {
  query: string
  type?: 'projects' | 'files' | 'templates'
  filters?: Record<string, any>
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface SearchResult<T> {
  items: T[]
  total: number
  facets?: Record<string, { value: string; count: number }[]>
  suggestions?: string[]
}

// Template Types
export interface TemplateSearchParams extends PaginationParams {
  category?: TemplateCategory
  framework?: SupportedFramework
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

export interface TemplatePreview {
  images: string[]
  demo_url?: string
  features: string[]
}

// Import/Export Types
export interface ExportOptions {
  format: 'zip' | 'json' | 'github'
  include_dependencies?: boolean
  include_build_artifacts?: boolean
  include_tests?: boolean
  minify_code?: boolean
}

export interface ImportOptions {
  format: 'zip' | 'github'
  create_new_project?: boolean
  project_name?: string
  project_description?: string
  overwrite_existing?: boolean
  skip_dependencies?: boolean
  include_tests?: boolean
  framework_detection?: boolean
}

export interface ImportProgress {
  stage: 'analyzing' | 'extracting' | 'validating' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  current_file?: string
  total_files?: number
  processed_files?: number
}

export interface ImportResult {
  success: boolean
  project?: Project
  error?: string
  warnings?: string[]
  imported_files?: number
  skipped_files?: string[]
  processing_time?: number
}

// Build Types
export interface BuildRequest {
  project_id: string
  config?: Partial<ProjectBuildConfig>
  optimize?: boolean
  analyze?: boolean
}

export interface BuildResponse {
  build_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  duration?: number
  result?: BuildResult
  logs?: string[]
}

export interface BuildResult {
  success: boolean
  output_dir: string
  files: BuildFile[]
  stats: BuildStats
  warnings?: string[]
  errors?: string[]
  bundle_analysis?: BundleAnalysis
}

export interface BundleAnalysis {
  total_size: number
  gzip_size: number
  chunks: ChunkInfo[]
  largest_modules: ModuleInfo[]
  duplicate_modules: ModuleInfo[]
}

export interface ChunkInfo {
  name: string
  size: number
  modules: string[]
}

export interface ModuleInfo {
  name: string
  size: number
  path: string
}

// Collaboration Types
export interface CollaborationSession {
  id: string
  project_id: string
  created_by: string
  participants: CollaborationParticipant[]
  created_at: string
  expires_at?: string
  settings: CollaborationSettings
}

export interface CollaborationParticipant {
  user_id: string
  name: string
  avatar?: string
  role: 'viewer' | 'editor' | 'admin'
  joined_at: string
  last_seen: string
  cursor?: CursorPosition
}

export interface CursorPosition {
  file_id: string
  line: number
  column: number
}

export interface CollaborationEvent {
  type: 'cursor' | 'selection' | 'edit' | 'join' | 'leave'
  user_id: string
  timestamp: string
  data: any
}

// Notification Types
export interface NotificationRequest {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  action?: NotificationAction
  channels?: ('in_app' | 'email' | 'push')[]
}

export interface NotificationAction {
  label: string
  url?: string
  action?: string
  data?: Record<string, any>
}

// Audit Log Types
export interface AuditLogEntry {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export interface AuditLogParams extends PaginationParams {
  user_id?: string
  action?: string
  resource_type?: string
  resource_id?: string
  date_from?: string
  date_to?: string
}

// Webhook Types
export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, any>
  timestamp: string
  signature?: string
}

// Integration Types
export interface GitHubIntegration {
  enabled: boolean
  access_token?: string
  repositories?: GitHubRepo[]
  webhook_secret?: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  language?: string
  size: number
  stargazers_count: number
  forks_count: number
}

// Analytics Types
export interface AnalyticsEvent {
  event_type: string
  user_id?: string
  project_id?: string
  session_id?: string
  properties: Record<string, any>
  timestamp: string
}

export interface AnalyticsMetrics {
  users: {
    total: number
    active: number
    new: number
  }
  projects: {
    total: number
    created: number
    updated: number
    deployed: number
  }
  ai_usage: {
    requests: number
    tokens: number
    cost: number
  }
  performance: {
    avg_response_time: number
    uptime: number
    error_rate: number
  }
}