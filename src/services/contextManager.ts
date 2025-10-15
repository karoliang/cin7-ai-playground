import {
  RequestContext,
  AIMessage,
  AIGatewayRequest,
  AIGatewayResponse
} from '@/types/aiGateway'
import { ProjectFile, ChatMessage } from '@/types'

/**
 * Context Management Service
 * Manages conversation context, project context, and contextual updates
 */
export class ContextManagerService {
  private contextStore = new Map<string, ConversationContext>()
  private projectContextStore = new Map<string, ProjectContext>()
  private config: ContextManagerConfig
  private metrics: ContextMetrics

  constructor(config: ContextManagerConfig) {
    this.config = config
    this.metrics = new ContextMetrics()
  }

  /**
   * Create or get conversation context
   */
  async getOrCreateConversationContext(sessionId: string, userId?: string): Promise<ConversationContext> {
    let context = this.contextStore.get(sessionId)

    if (!context) {
      context = {
        id: sessionId,
        userId,
        messages: [],
        contextData: {},
        metadata: {
          createdAt: Date.now(),
          lastActivity: Date.now(),
          messageCount: 0,
          totalTokens: 0
        }
      }

      this.contextStore.set(sessionId, context)
      this.metrics.recordContextCreation('conversation')
    }

    return context
  }

  /**
   * Create or get project context
   */
  async getOrCreateProjectContext(projectId: string, userId?: string): Promise<ProjectContext> {
    let context = this.projectContextStore.get(projectId)

    if (!context) {
      context = {
        id: projectId,
        userId,
        files: [],
        architecture: null,
        framework: null,
        contextData: {},
        metadata: {
          createdAt: Date.now(),
          lastActivity: Date.now(),
          fileCount: 0,
          totalSize: 0
        }
      }

      this.projectContextStore.set(projectId, context)
      this.metrics.recordContextCreation('project')
    }

    return context
  }

  /**
   * Add message to conversation context
   */
  async addMessage(sessionId: string, message: AIMessage): Promise<void> {
    const context = await this.getOrCreateConversationContext(sessionId)

    context.messages.push({
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId()
    })

    // Enforce message limit
    if (context.messages.length > this.config.maxConversationMessages) {
      context.messages = context.messages.slice(-this.config.maxConversationMessages)
    }

    context.metadata.lastActivity = Date.now()
    context.metadata.messageCount = context.messages.length

    this.metrics.recordMessageAdded()
  }

  /**
   * Update project files in context
   */
  async updateProjectFiles(projectId: string, files: ProjectFile[]): Promise<void> {
    const context = await this.getOrCreateProjectContext(projectId)

    context.files = files
    context.metadata.fileCount = files.length
    context.metadata.totalSize = files.reduce((total, file) => total + (file.size || 0), 0)
    context.metadata.lastActivity = Date.now()

    this.metrics.recordFilesUpdated(files.length)
  }

  /**
   * Set project architecture context
   */
  async setProjectArchitecture(projectId: string, architecture: any, framework?: string): Promise<void> {
    const context = await this.getOrCreateProjectContext(projectId)

    context.architecture = architecture
    context.framework = framework
    context.metadata.lastActivity = Date.now()

    this.metrics.recordArchitectureUpdate()
  }

  /**
   * Update context data
   */
  async updateContextData(sessionId: string, data: Record<string, any>): Promise<void> {
    const context = await this.getOrCreateConversationContext(sessionId)

    context.contextData = {
      ...context.contextData,
      ...data
    }

    context.metadata.lastActivity = Date.now()
  }

  /**
   * Build enhanced request context
   */
  async buildRequestContext(request: AIGatewayRequest): Promise<EnhancedRequestContext> {
    const enhancedContext: EnhancedRequestContext = {
      original: request.context || {},
      conversation: null,
      project: null,
      session: null,
      global: await this.getGlobalContext()
    }

    // Get conversation context if session ID is available
    if (request.context?.sessionId) {
      enhancedContext.conversation = await this.getOrCreateConversationContext(
        request.context.sessionId,
        request.context.userId
      )
    }

    // Get project context if project ID is available
    if (request.context?.projectId) {
      enhancedContext.project = await this.getOrCreateProjectContext(
        request.context.projectId,
        request.context.userId
      )
    }

    // Build session context
    enhancedContext.session = await this.buildSessionContext(request)

    return enhancedContext
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, limit?: number): Promise<AIMessage[]> {
    const context = this.contextStore.get(sessionId)
    if (!context) {
      return []
    }

    const messages = context.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata
    }))

    return limit ? messages.slice(-limit) : messages
  }

  /**
   * Get project context summary
   */
  async getProjectContextSummary(projectId: string): Promise<ProjectContextSummary | null> {
    const context = this.projectContextStore.get(projectId)
    if (!context) {
      return null
    }

    return {
      id: context.id,
      fileCount: context.files.length,
      framework: context.framework,
      architecture: context.architecture?.type || 'unknown',
      totalSize: context.metadata.totalSize,
      lastActivity: context.metadata.lastActivity,
      hasCode: context.files.some(file => ['typescript', 'javascript', 'jsx', 'tsx'].includes(file.type))
    }
  }

  /**
   * Clear conversation context
   */
  async clearConversationContext(sessionId: string): Promise<void> {
    this.contextStore.delete(sessionId)
    this.metrics.recordContextClear('conversation')
  }

  /**
   * Clear project context
   */
  async clearProjectContext(projectId: string): Promise<void> {
    this.projectContextStore.delete(projectId)
    this.metrics.recordContextClear('project')
  }

  /**
   * Cleanup old contexts
   */
  async cleanup(): Promise<CleanupResult> {
    const now = Date.now()
    const cutoff = now - this.config.contextTTL
    let conversationsCleared = 0
    let projectsCleared = 0

    // Clean up conversation contexts
    for (const [sessionId, context] of this.contextStore) {
      if (context.metadata.lastActivity < cutoff) {
        this.contextStore.delete(sessionId)
        conversationsCleared++
      }
    }

    // Clean up project contexts
    for (const [projectId, context] of this.projectContextStore) {
      if (context.metadata.lastActivity < cutoff) {
        this.projectContextStore.delete(projectId)
        projectsCleared++
      }
    }

    this.metrics.recordCleanup(conversationsCleared, projectsCleared)

    return {
      conversationsCleared,
      projectsCleared,
      timestamp: now
    }
  }

  /**
   * Get context statistics
   */
  getStats(): ContextStats {
    return {
      ...this.metrics.getStats(),
      currentConversations: this.contextStore.size,
      currentProjects: this.projectContextStore.size,
      config: {
        maxConversationMessages: this.config.maxConversationMessages,
        contextTTL: this.config.contextTTL,
        maxContextSize: this.config.maxContextSize
      }
    }
  }

  /**
   * Build session context
   */
  private async buildSessionContext(request: AIGatewayRequest): Promise<SessionContext> {
    return {
      sessionId: request.context?.sessionId || this.generateSessionId(),
      userId: request.context?.userId,
      startTime: Date.now(),
      userAgent: request.metadata?.userAgent,
      ipAddress: request.metadata?.ipAddress,
      source: request.metadata?.source || 'unknown'
    }
  }

  /**
   * Get global context
   */
  private async getGlobalContext(): Promise<GlobalContext> {
    return {
      version: '2.0.0',
      environment: import.meta.env.MODE,
      features: {
        streaming: true,
        caching: true,
        rateLimiting: true
      },
      timestamp: Date.now()
    }
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Context Enhancement Service
 * Enhances AI requests with rich context information
 */
export class ContextEnhancementService {
  private contextManager: ContextManagerService
  private config: ContextEnhancementConfig

  constructor(contextManager: ContextManagerService, config: ContextEnhancementConfig) {
    this.contextManager = contextManager
    this.config = config
  }

  /**
   * Enhance request with context
   */
  async enhanceRequest(request: AIGatewayRequest): Promise<EnhancedAIGatewayRequest> {
    const enhancedRequest: EnhancedAIGatewayRequest = {
      ...request,
      enhancedContext: await this.contextManager.buildRequestContext(request),
      contextualPrompts: [],
      relevantFiles: [],
      conversationHistory: []
    }

    // Add contextual prompts
    enhancedRequest.contextualPrompts = await this.buildContextualPrompts(enhancedRequest.enhancedContext)

    // Add relevant files
    enhancedRequest.relevantFiles = await this.getRelevantFiles(enhancedRequest.enhancedContext)

    // Add conversation history
    enhancedRequest.conversationHistory = await this.getRelevantConversationHistory(enhancedRequest.enhancedContext)

    // Enhance system message
    enhancedRequest.messages = await this.enhanceSystemMessage(enhancedRequest)

    return enhancedRequest
  }

  /**
   * Build contextual prompts
   */
  private async buildContextualPrompts(context: EnhancedRequestContext): Promise<string[]> {
    const prompts: string[] = []

    // Add framework-specific context
    if (context.project?.framework) {
      prompts.push(`Framework: ${context.project.framework}`)
    }

    // Add architecture context
    if (context.project?.architecture) {
      prompts.push(`Architecture: ${JSON.stringify(context.project.architecture)}`)
    }

    // Add project file context
    if (context.project?.files && context.project.files.length > 0) {
      const fileTypes = [...new Set(context.project.files.map(f => f.type))]
      prompts.push(`Project contains: ${fileTypes.join(', ')} files`)
    }

    // Add conversation context
    if (context.conversation && context.conversation.messages.length > 0) {
      prompts.push(`This is a continuing conversation (turn ${context.conversation.messages.length + 1})`)
    }

    return prompts
  }

  /**
   * Get relevant files based on context
   */
  private async getRelevantFiles(context: EnhancedRequestContext): Promise<ProjectFile[]> {
    if (!context.project?.files) {
      return []
    }

    // For now, return all files - in practice, you'd implement more sophisticated relevance scoring
    return context.project.files.slice(0, this.config.maxRelevantFiles)
  }

  /**
   * Get relevant conversation history
   */
  private async getRelevantConversationHistory(context: EnhancedRequestContext): Promise<AIMessage[]> {
    if (!context.conversation) {
      return []
    }

    const history = context.conversation.messages.slice(-this.config.maxConversationHistory)
    return history.map(msg => ({
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata
    }))
  }

  /**
   * Enhance system message with context
   */
  private async enhanceSystemMessage(request: EnhancedAIGatewayRequest): Promise<AIMessage[]> {
    const enhancedMessages = [...request.messages]

    // Find or create system message
    let systemMessage = enhancedMessages.find(msg => msg.role === 'system')

    if (!systemMessage) {
      systemMessage = {
        role: 'system',
        content: '',
        metadata: {}
      }
      enhancedMessages.unshift(systemMessage)
    }

    // Build enhanced system prompt
    let enhancedPrompt = systemMessage.content

    // Add project context
    if (request.enhancedContext.project) {
      enhancedPrompt += this.buildProjectContextPrompt(request.enhancedContext.project)
    }

    // Add conversation context
    if (request.enhancedContext.conversation) {
      enhancedPrompt += this.buildConversationContextPrompt(request.enhancedContext.conversation)
    }

    // Add contextual prompts
    if (request.contextualPrompts.length > 0) {
      enhancedPrompt += '\n\nAdditional Context:\n' + request.contextualPrompts.join('\n')
    }

    systemMessage.content = enhancedPrompt

    return enhancedMessages
  }

  /**
   * Build project context prompt
   */
  private buildProjectContextPrompt(project: ProjectContext): string {
    let prompt = '\n\nProject Context:\n'
    prompt += `- Framework: ${project.framework || 'Not specified'}\n`
    prompt += `- Architecture: ${project.architecture?.type || 'Not specified'}\n`
    prompt += `- Files: ${project.files.length} files\n`

    if (project.files.length > 0) {
      const fileList = project.files.slice(0, 10).map(f => `- ${f.name} (${f.type})`).join('\n')
      prompt += `Recent files:\n${fileList}`
    }

    return prompt
  }

  /**
   * Build conversation context prompt
   */
  private buildConversationContextPrompt(conversation: ConversationContext): string {
    return `\n\nConversation Context:\n- Message count: ${conversation.messages.length}\n- Last activity: ${new Date(conversation.metadata.lastActivity).toISOString()}`
  }
}

/**
 * Context Types
 */
export interface ContextManagerConfig {
  maxConversationMessages: number
  maxContextSize: number
  contextTTL: number
}

export interface ContextEnhancementConfig {
  maxRelevantFiles: number
  maxConversationHistory: number
  includeFileContent: boolean
  includeConversationHistory: boolean
}

export interface ConversationContext {
  id: string
  userId?: string
  messages: ConversationMessage[]
  contextData: Record<string, any>
  metadata: {
    createdAt: number
    lastActivity: number
    messageCount: number
    totalTokens: number
  }
}

export interface ConversationMessage extends AIMessage {
  id: string
  timestamp: number
}

export interface ProjectContext {
  id: string
  userId?: string
  files: ProjectFile[]
  architecture: any
  framework?: string
  contextData: Record<string, any>
  metadata: {
    createdAt: number
    lastActivity: number
    fileCount: number
    totalSize: number
  }
}

export interface EnhancedRequestContext {
  original: RequestContext
  conversation: ConversationContext | null
  project: ProjectContext | null
  session: SessionContext | null
  global: GlobalContext
}

export interface SessionContext {
  sessionId: string
  userId?: string
  startTime: number
  userAgent?: string
  ipAddress?: string
  source: string
}

export interface GlobalContext {
  version: string
  environment: string
  features: Record<string, boolean>
  timestamp: number
}

export interface EnhancedAIGatewayRequest extends AIGatewayRequest {
  enhancedContext: EnhancedRequestContext
  contextualPrompts: string[]
  relevantFiles: ProjectFile[]
  conversationHistory: AIMessage[]
}

export interface ProjectContextSummary {
  id: string
  fileCount: number
  framework?: string
  architecture: string
  totalSize: number
  lastActivity: number
  hasCode: boolean
}

export interface CleanupResult {
  conversationsCleared: number
  projectsCleared: number
  timestamp: number
}

export interface ContextStats {
  conversationsCreated: number
  projectsCreated: number
  messagesAdded: number
  filesUpdated: number
  architectureUpdates: number
  contextsCleared: number
  cleanupOperations: number
  currentConversations: number
  currentProjects: number
  config: {
    maxConversationMessages: number
    contextTTL: number
    maxContextSize: number
  }
}

/**
 * Context Metrics
 */
class ContextMetrics {
  private conversationsCreated = 0
  private projectsCreated = 0
  private messagesAdded = 0
  private filesUpdated = 0
  private architectureUpdates = 0
  private contextsCleared = 0
  private cleanupOperations = 0

  recordContextCreation(type: 'conversation' | 'project'): void {
    if (type === 'conversation') {
      this.conversationsCreated++
    } else {
      this.projectsCreated++
    }
  }

  recordMessageAdded(): void {
    this.messagesAdded++
  }

  recordFilesUpdated(count: number): void {
    this.filesUpdated += count
  }

  recordArchitectureUpdate(): void {
    this.architectureUpdates++
  }

  recordContextClear(type: 'conversation' | 'project'): void {
    this.contextsCleared++
  }

  recordCleanup(conversations: number, projects: number): void {
    this.cleanupOperations++
  }

  getStats(): Omit<ContextStats, 'currentConversations' | 'currentProjects' | 'config'> {
    return {
      conversationsCreated: this.conversationsCreated,
      projectsCreated: this.projectsCreated,
      messagesAdded: this.messagesAdded,
      filesUpdated: this.filesUpdated,
      architectureUpdates: this.architectureUpdates,
      contextsCleared: this.contextsCleared,
      cleanupOperations: this.cleanupOperations
    }
  }
}

// Default configurations
export const DEFAULT_CONTEXT_MANAGER_CONFIG: ContextManagerConfig = {
  maxConversationMessages: 50,
  maxContextSize: 100000, // 100KB
  contextTTL: 24 * 60 * 60 * 1000 // 24 hours
}

export const DEFAULT_CONTEXT_ENHANCEMENT_CONFIG: ContextEnhancementConfig = {
  maxRelevantFiles: 10,
  maxConversationHistory: 10,
  includeFileContent: true,
  includeConversationHistory: true
}

// Export factory functions
export function createContextManager(config: Partial<ContextManagerConfig> = {}): ContextManagerService {
  const finalConfig = { ...DEFAULT_CONTEXT_MANAGER_CONFIG, ...config }
  return new ContextManagerService(finalConfig)
}

export function createContextEnhancer(
  contextManager: ContextManagerService,
  config: Partial<ContextEnhancementConfig> = {}
): ContextEnhancementService {
  const finalConfig = { ...DEFAULT_CONTEXT_ENHANCEMENT_CONFIG, ...config }
  return new ContextEnhancementService(contextManager, finalConfig)
}