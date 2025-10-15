/**
 * Project-related type definitions
 */

export interface ProjectStatus {
  id: string
  name: string
  description: string
  color: string
  order: number
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: string
  framework: SupportedFramework
  thumbnail?: string
  files: TemplateFile[]
  settings: ProjectSettings
  architecture: ProjectArchitecture
}

export interface SupportedFramework {
  id: string
  name: string
  version: string
  language: string
  buildTool: string
  packageManager: string
  devServer?: string
  buildCommand?: string
  startCommand?: string
}

export interface ProjectSettings {
  name: string
  description?: string
  framework: SupportedFramework
  theme: ThemeSettings
  features: string[]
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  scripts: Record<string, string>
  env: Record<string, string>
  paths: {
    src: string
    dist: string
    public: string
    components: string
    pages: string
    utils: string
    styles: string
  }
}

export interface ProjectMetadata {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  ownerId: string
  collaborators: string[]
  status: ProjectStatus
  template: ProjectTemplate
  settings: ProjectSettings
  tags: string[]
  isPublic: boolean
  forkCount: number
  starCount: number
}

export interface Project {
  id: string
  name: string
  description?: string
  metadata: ProjectMetadata
  files: ProjectFile[]
  builds: ProjectBuild[]
  deployments: Deployment[]
  collaborations: Collaboration[]
  settings: ProjectSettings
}

export interface ProjectFile {
  id: string
  name: string
  path: string
  type: FileType
  content: string
  size: number
  createdAt: string
  updatedAt: string
  ownerId: string
  isPublic: boolean
  language?: string
  framework?: string
  dependencies?: string[]
  metadata?: Record<string, any>
}

export interface FileType {
  id: string
  name: string
  extension: string
  mime: string
  language: string
  icon: string
  isEditable: boolean
  isBinary: boolean
  syntax: string
  category: string
}

export interface FileOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'copy'
  fileId: string
  path: string
  oldPath?: string
  content?: string
  metadata?: Record<string, any>
  createdAt: string
  userId: string
  applied: boolean
  appliedAt?: string
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  createdAt: string
  userId: string
  projectId?: string
  metadata?: MessageMetadata
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  isEdited: boolean
  editedAt?: string
}

export interface MessageMetadata {
  model?: string
  temperature?: number
  maxTokens?: number
  cost?: number
  processingTime?: number
  context?: string[]
  references?: string[]
  confidence?: number
}

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  thumbnail?: string
  metadata?: Record<string, any>
}

export interface MessageReaction {
  id: string
  emoji: string
  userId: string
  createdAt: string
}

export interface TemplateFile {
  name: string
  path: string
  type: FileType
  content: string
  description?: string
  editable?: boolean
  required?: boolean
  metadata?: Record<string, any>
}

export interface ProjectArchitecture {
  type: 'spa' | 'mpa' | 'ssr' | 'static' | 'hybrid'
  structure: string[]
  patterns: string[]
  libraries: string[]
  frameworks: string[]
  databases?: string[]
  apis?: string[]
  services?: string[]
  deployment: DeploymentConfig
}

export interface ProjectBuildConfig {
  command: string
  outputDir: string
  publicDir?: string
  assetsDir?: string
  sourcemap: boolean
  minify: boolean
  target: string[]
  define: Record<string, string>
  resolve: {
    alias: Record<string, string>
    extensions: string[]
  }
  optimize: boolean
  optimizeDeps?: string[]
  external?: string[]
  rollup?: {
    plugins?: string[]
    output?: {
      format: string
      exports: string
    }
  }
}

export interface DeploymentConfig {
  provider: 'vercel' | 'netlify' | 'github-pages' | 'firebase' | 'aws' | 'custom'
  environment: 'development' | 'staging' | 'production'
  buildCommand: string
  outputDir: string
  envVars: Record<string, string>
  domains?: string[]
  customDomain?: string
  ssl: boolean
  caching?: {
    enabled: boolean
    ttl: number
    strategy: string
  }
  monitoring?: {
    enabled: boolean
    endpoint?: string
    apiKey?: string
  }
}

export interface ProjectBuild {
  id: string
  projectId: string
  version: string
  status: 'pending' | 'building' | 'success' | 'failed' | 'cancelled'
  createdAt: string
  startedAt?: string
  completedAt?: string
  duration?: number
  config: ProjectBuildConfig
  logs?: string[]
  artifacts?: BuildFile[]
  stats?: BuildStats
  triggeredBy: string
  commit?: string
}

export interface BuildFile {
  id: string
  name: string
  path: string
  size: number
  type: string
  hash: string
  createdAt: string
}

export interface BuildStats {
  totalSize: number
  files: number
  dependencies: number
  buildTime: number
  bundleSize: number
  gzipSize: number
  treeshaking: boolean
  codeSplitting: boolean
  lazyLoading: boolean
}

export interface Deployment {
  id: string
  buildId: string
  projectId: string
  version: string
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'cancelled'
  environment: string
  url?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  duration?: number
  config: DeploymentConfig
  logs?: string[]
  triggeredBy: string
  rollbackEnabled: boolean
}

export interface Collaboration {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  permissions: string[]
  joinedAt: string
  invitedBy: string
  settings: CollaborationSettings
  status: 'active' | 'pending' | 'inactive' | 'removed'
}

export interface CollaborationSettings {
  notifications: boolean
  presence: boolean
  chat: boolean
  fileSharing: boolean
  editing: 'realtime' | 'locked' | 'comment'
  reviewRequired: boolean
  autoSave: boolean
  conflictResolution: 'manual' | 'auto'
}

export interface ThemeSettings {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    error: string
    warning: string
    success: string
    info: string
  }
  typography: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    lineHeight: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: string
  shadows: {
    sm: string
    md: string
    lg: string
  }
  animations: {
    duration: string
    easing: string
  }
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  order: number
  templates: ProjectTemplate[]
}