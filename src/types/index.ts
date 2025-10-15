// Core type definitions for CIN7 AI Playground

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  prompt?: string
  files: ProjectFile[]
  messages: ChatMessage[]
  metadata: ProjectMetadata
  settings: ProjectSettings
  status: ProjectStatus
  user_id: string
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  name: string
  type: FileType
  content: string
  language?: string
  path?: string
  size?: number
  created_at?: string
  updated_at?: string
}

export type FileType =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'md'
  | 'txt'
  | 'image'
  | 'other'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  metadata?: MessageMetadata
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface MessageMetadata {
  files?: ProjectFile[]
  operations?: FileOperation[]
  reasoning?: string
  confidence?: number
  media?: MediaMetadata[]
}

export interface MediaMetadata {
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  name: string
  size: number
  mimeType: string
  thumbnail?: string
  duration?: number
  dimensions?: {
    width: number
    height: number
  }
}

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'move'
  file: string
  content?: string
  from?: string
  to?: string
  reason?: string
}

export interface ProjectMetadata {
  name?: string
  architecture?: ProjectArchitecture
  framework?: SupportedFramework
  template?: ProjectTemplate
  build_config?: ProjectBuildConfig
  deployment?: DeploymentConfig
  tags?: string[]
  last_modified?: string
  version?: string
}

export interface ProjectArchitecture {
  type: 'single-page' | 'multi-page' | 'dashboard' | 'e-commerce' | 'portfolio' | 'custom'
  pages?: PageConfig[]
  routing?: RoutingConfig
  components?: ComponentConfig[]
}

// Alias for ProjectArchitecture used in routing generation
export type DetectedArchitecture = ProjectArchitecture & {
  framework?: string
  layout?: {
    type: 'sidebar' | 'header' | 'none'
  }
  pages?: Array<{
    name: string
    title?: string
    description?: string
    path?: string
    children?: any[]
    polaris?: boolean
  }>
  polaris?: boolean
}

export interface PageConfig {
  id: string
  name: string
  path: string
  title: string
  description?: string
  components?: string[]
  meta?: Record<string, any>
}

export interface RoutingConfig {
  type: 'client-side' | 'server-side' | 'static'
  base_path?: string
  routes?: RouteConfig[]
}

export interface RouteConfig {
  path: string
  component: string
  exact?: boolean
  meta?: Record<string, any>
}

export interface ComponentConfig {
  name: string
  type: 'page' | 'layout' | 'ui' | 'business'
  props?: Record<string, any>
  dependencies?: string[]
}

export type SupportedFramework =
  | 'vanilla'
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'preact'
  | 'solid'

export type ProjectTemplate =
  | 'blank'
  | 'dashboard'
  | 'e-commerce'
  | 'blog'
  | 'portfolio'
  | 'saas'
  | 'landing-page'
  | 'admin-panel'
  | 'multi-page-app'
  | 'cin7-sales'
  | 'cin7-inventory'
  | 'cin7-analytics'
  | 'mobile-commerce'

export interface ProjectBuildConfig {
  bundler?: 'vite' | 'webpack' | 'rollup' | 'esbuild'
  output_dir?: string
  public_path?: string
  minify?: boolean
  sourcemap?: boolean
  optimization?: {
    split_chunks?: boolean
    tree_shaking?: boolean
    compression?: boolean
  }
}

export interface DeploymentConfig {
  platform?: 'netlify' | 'vercel' | 'github-pages' | 'custom'
  url?: string
  environment?: Record<string, string>
  build_command?: string
  output_dir?: string
}

export interface ProjectSettings {
  theme: ThemeSettings
  editor: EditorSettings
  preview: PreviewSettings
  ai: AISettings
  collaboration: CollaborationSettings
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto'
  primary_color?: string
  custom_css?: string
  framework?: string
}

export interface EditorSettings {
  tab_size: number
  word_wrap: boolean
  minimap: boolean
  line_numbers: boolean
  font_size: number
  theme: string
}

export interface PreviewSettings {
  auto_refresh: boolean
  device: DeviceType
  orientation: OrientationType
  size: PreviewSize
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile'
export type OrientationType = 'portrait' | 'landscape'

export interface PreviewSize {
  width: number
  height: number
}

export interface AISettings {
  model: string
  temperature: number
  max_tokens: number
  context_window: number
  auto_suggestions: boolean
  code_completion: boolean
}

export interface CollaborationSettings {
  real_time: boolean
  share_link?: string
  permissions: PermissionConfig[]
}

export interface PermissionConfig {
  user_id: string
  role: 'viewer' | 'editor' | 'admin'
  granted_at: string
}

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'archived'
  | 'deleted'
  | 'building'
  | 'deployed'
  | 'error'

// API Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface GenerateRequest {
  prompt: string
  existing_files?: ProjectFile[]
  chat_history?: ChatMessage[]
  context?: RequestContext
  options?: GenerateOptions
}

export interface RequestContext {
  project_id?: string
  user_id?: string
  session_id?: string
  framework?: SupportedFramework
  template?: ProjectTemplate
  architecture?: ProjectArchitecture
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
  build_config?: BuildConfig
  deployment_config?: DeploymentConfig
  next_steps?: string[]
  warnings?: string[]
  error?: string
}

// Contextual Update System Types
export interface ContextItem {
  id: string
  type: ContextType
  content: string
  priority: ContextPriority
  scope: ContextScope
  target_files?: string[]
  timestamp: number
  applied: boolean
}

export type ContextType = 'instruction' | 'file' | 'constraint' | 'example'
export type ContextPriority = 'low' | 'medium' | 'high' | 'critical'
export type ContextScope = 'global' | 'file-specific' | 'component' | 'page'

export interface ContextualUpdateRequest {
  trigger_context?: ContextItem
  enhanced_context: EnhancedContext
  strategy: UpdateStrategy
}

export interface EnhancedContext {
  prompt: string
  mode: 'contextual-update' | 'generation'
  existing_files: ProjectFile[]
  chat_history: ChatMessage[]
  contextual_instructions: ContextItem[]
  project_metadata: ProjectMetadata
  update_trigger?: ContextItem
  context_metrics: ContextMetrics
}

export interface ContextMetrics {
  total_instructions: number
  unapplied_instructions: number
  last_update: number
  changes_since_last_gen: boolean
}

export interface UpdateStrategy {
  type: 'full' | 'selective' | 'targeted'
  confidence: number
  reasoning: string[]
  target_files?: string[]
}

// Template System Types
export interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  framework: SupportedFramework
  architecture: ProjectArchitecture
  files: TemplateFile[]
  settings: Partial<ProjectSettings>
  preview?: TemplatePreview
  metadata: TemplateMetadata
}

export type TemplateCategory =
  | 'business'
  | 'e-commerce'
  | 'dashboard'
  | 'portfolio'
  | 'blog'
  | 'landing-page'
  | 'cin7'
  | 'custom'

export interface TemplateFile {
  name: string
  type: FileType
  content: string
  description?: string
  editable?: boolean
  required?: boolean
}

export interface TemplatePreview {
  images: string[]
  demo_url?: string
  features: string[]
}

export interface TemplateMetadata {
  author: string
  version: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number
  dependencies?: string[]
}

// Build System Types
export interface BuildConfig {
  project_id: string
  name: string
  version: string
  entry_points: string[]
  output_dir: string
  public_dir: string
  assets_dir: string
  optimization: BuildOptimization
  plugins: BuildPlugin[]
}

export interface BuildOptimization {
  minify: boolean
  sourcemap: boolean
  split_chunks: boolean
  tree_shaking: boolean
  compression: boolean
  bundle_analysis: boolean
}

export interface BuildPlugin {
  name: string
  options: Record<string, any>
}

export interface BuildResult {
  success: boolean
  output_dir: string
  files: BuildFile[]
  stats: BuildStats
  warnings?: string[]
  errors?: string[]
}

export interface BuildFile {
  name: string
  path: string
  size: number
  type: 'asset' | 'chunk' | 'entry'
}

export interface BuildStats {
  total_size: number
  gzip_size: number
  build_time: number
  chunk_count: number
  asset_count: number
}

// UI State Types
export interface UIState {
  sidebar_collapsed: boolean
  active_panel: 'chat' | 'files' | 'preview' | 'settings'
  active_file?: string
  split_sizes: number[]
  theme: 'light' | 'dark' | 'auto'
  notifications: Notification[]
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  action?: NotificationAction
}

export interface NotificationAction {
  label: string
  action: () => void
}

// Import Types
export interface ImportProgress {
  stage: 'analyzing' | 'extracting' | 'validating' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  currentFile?: string
}

export interface ImportResult {
  success: boolean
  project?: Project
  error?: string
  warnings?: string[]
  importedFiles?: number
  skippedFiles?: string[]
}

export interface ImportOptions {
  format: 'zip' | 'github'
  createNewProject: boolean
  projectName?: string
  projectDescription?: string
  overwriteExisting?: boolean
  skipDependencies?: boolean
  includeTests?: boolean
  frameworkDetection?: boolean
}

export interface ImportSource {
  type: 'file' | 'github'
  file?: File
  url?: string
  branch?: string
}

export interface ImportValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  detectedFramework?: SupportedFramework
  detectedFiles?: ProjectFile[]
  estimatedSize?: number
}

export interface GitHubRepoInfo {
  name: string
  description?: string
  defaultBranch: string
  languages: string[]
  size: number
  isPrivate: boolean
  fileCount: number
}