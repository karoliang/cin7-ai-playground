import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  Project,
  ProjectFile,
  ChatMessage,
  ProjectSettings,
  UIState,
  GenerateRequest,
  GenerateResponse,
  ContextItem
} from '@/types'

interface ProjectState {
  // Current project
  currentProject: Project | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  // Project files
  files: ProjectFile[]
  activeFileId: string | null
  activeFile: ProjectFile | null

  // Chat
  messages: ChatMessage[]
  isGenerating: boolean
  generationProgress: string
  streamingMessage: string | null
  isTyping: boolean

  // Contextual updates
  contextualUpdates: ContextItem[]
  contextualUpdateQueue: ContextItem[]

  // UI state
  uiState: UIState

  // Actions
  createProject: (prompt: string, template?: string) => Promise<string>
  loadProject: (projectId: string) => Promise<void>
  saveProject: (force?: boolean) => Promise<void>
  updateProject: (updates: Partial<Project>) => void

  // File management
  addFile: (file: Omit<ProjectFile, 'id' | 'created_at' | 'updated_at'>) => void
  updateFile: (fileId: string, updates: Partial<ProjectFile>) => void
  deleteFile: (fileId: string) => void
  setActiveFile: (fileId: string | null) => void

  // Chat actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  generateCode: (prompt: string, options?: any) => Promise<void>
  sendChatMessage: (message: string) => Promise<void>
  setStreamingMessage: (message: string | null) => void
  setIsTyping: (isTyping: boolean) => void
  clearChat: () => void

  // Contextual updates
  addContextualUpdate: (context: Omit<ContextItem, 'id' | 'timestamp' | 'applied'>) => Promise<void>
  processContextualUpdate: (contextId: string) => Promise<void>

  // UI actions
  updateUIState: (updates: Partial<UIState>) => void

  // Utility
  clearError: () => void
  resetState: () => void
}

const createDefaultProject = (): Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'> => ({
  name: 'New Project',
  description: '',
  prompt: '',
  files: [],
  messages: [],
  metadata: {
    architecture: {
      type: 'single-page'
    }
  },
  settings: {
    theme: {
      mode: 'light'
    },
    editor: {
      tab_size: 2,
      word_wrap: true,
      minimap: true,
      line_numbers: true,
      font_size: 14,
      theme: 'vs-dark'
    },
    preview: {
      auto_refresh: true,
      device: 'desktop',
      orientation: 'landscape',
      size: { width: 1200, height: 800 }
    },
    ai: {
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      max_tokens: 4000,
      context_window: 200000,
      auto_suggestions: true,
      code_completion: true
    },
    collaboration: {
      real_time: false,
      permissions: []
    }
  },
  status: 'draft'
})

const createDefaultUIState = (): UIState => ({
  sidebar_collapsed: false,
  active_panel: 'chat',
  split_sizes: [30, 40, 30],
  theme: 'light',
  notifications: []
})

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProject: null,
    isLoading: false,
    isSaving: false,
    error: null,
    files: [],
    activeFileId: null,
    activeFile: null,
    messages: [],
    isGenerating: false,
    generationProgress: '',
    streamingMessage: null,
    isTyping: false,
    contextualUpdates: [],
    contextualUpdateQueue: [],
    uiState: createDefaultUIState(),

    // Project management
    createProject: async (prompt: string, template?: string) => {
      try {
        set({ isLoading: true, error: null })

        const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const newProject: Project = {
          id: projectId,
          user_id: get().user?.id || 'anonymous',
          ...createDefaultProject(),
          name: `Project ${projectId.slice(-8).toUpperCase()}`,
          prompt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Save to database
        const { saveProjectToDB } = await import('@/services/projectService')
        await saveProjectToDB(newProject)

        set({
          currentProject: newProject,
          files: newProject.files,
          messages: newProject.messages,
          isLoading: false
        })

        return projectId

      } catch (error) {
        console.error('Create project error:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to create project',
          isLoading: false
        })
        throw error
      }
    },

    loadProject: async (projectId: string) => {
      try {
        set({ isLoading: true, error: null })

        const { loadProjectFromDB } = await import('@/services/projectService')
        const project = await loadProjectFromDB(projectId)

        if (!project) {
          throw new Error('Project not found')
        }

        set({
          currentProject: project,
          files: project.files,
          messages: project.messages,
          activeFileId: project.files[0]?.id || null,
          activeFile: project.files[0] || null,
          isLoading: false
        })

      } catch (error) {
        console.error('Load project error:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to load project',
          isLoading: false
        })
        throw error
      }
    },

    saveProject: async (force = false) => {
      const { currentProject, isSaving, files, messages } = get()

      if (!currentProject || (isSaving && !force)) return

      try {
        set({ isSaving: true, error: null })

        const updatedProject: Project = {
          ...currentProject,
          files,
          messages,
          updated_at: new Date().toISOString()
        }

        const { saveProjectToDB } = await import('@/services/projectService')
        await saveProjectToDB(updatedProject)

        set({
          currentProject: updatedProject,
          isSaving: false
        })

      } catch (error) {
        console.error('Save project error:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to save project',
          isSaving: false
        })
      }
    },

    updateProject: (updates: Partial<Project>) => {
      const { currentProject } = get()
      if (!currentProject) return

      set({
        currentProject: {
          ...currentProject,
          ...updates,
          updated_at: new Date().toISOString()
        }
      })
    },

    // File management
    addFile: (fileData) => {
      const newFile: ProjectFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...fileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      set(state => ({
        files: [...state.files, newFile],
        activeFileId: newFile.id,
        activeFile: newFile
      }))
    },

    updateFile: (fileId, updates) => {
      set(state => {
        const updatedFiles = state.files.map(file =>
          file.id === fileId
            ? { ...file, ...updates, updated_at: new Date().toISOString() }
            : file
        )

        const updatedFile = updatedFiles.find(f => f.id === fileId)

        return {
          files: updatedFiles,
          activeFile: state.activeFileId === fileId ? updatedFile || null : state.activeFile
        }
      })
    },

    deleteFile: (fileId) => {
      set(state => {
        const updatedFiles = state.files.filter(file => file.id !== fileId)
        const newActiveFile = state.activeFileId === fileId
          ? updatedFiles[0] || null
          : state.activeFile

        return {
          files: updatedFiles,
          activeFileId: newActiveFile?.id || null,
          activeFile: newActiveFile
        }
      })
    },

    setActiveFile: (fileId) => {
      const file = get().files.find(f => f.id === fileId) || null
      set({ activeFileId: fileId, activeFile: file })
    },

    // Chat actions
    addMessage: (messageData) => {
      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...messageData,
        timestamp: new Date().toISOString()
      }

      set(state => ({
        messages: [...state.messages, newMessage]
      }))
    },

    generateCode: async (prompt: string, options = {}) => {
      try {
        set({ isGenerating: true, error: null, generationProgress: 'Initializing...' })

        const { files, messages, currentProject } = get()

        const request: GenerateRequest = {
          prompt,
          existing_files: files,
          chat_history: messages,
          options: {
            temperature: currentProject?.settings.ai.temperature || 0.7,
            max_tokens: currentProject?.settings.ai.max_tokens || 4000,
            ...options
          }
        }

        set({ generationProgress: 'Connecting to AI service...' })

        const { generateCodeWithAI } = await import('@/services/aiService')
        const response: GenerateResponse = await generateCodeWithAI(request)

        if (response.success) {
          // Add new files
          response.files.forEach(file => {
            get().addFile(file)
          })

          // Add assistant message
          get().addMessage({
            role: 'assistant',
            content: response.reasoning || 'Code generated successfully',
            metadata: {
              files: response.files,
              operations: response.operations,
              reasoning: response.reasoning,
              confidence: response.confidence
            }
          })

          // Auto-save after generation
          setTimeout(() => get().saveProject(), 1000)

        } else {
          throw new Error(response.error || 'Failed to generate code')
        }

        set({ isGenerating: false, generationProgress: '' })

      } catch (error) {
        console.error('Generate code error:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to generate code',
          isGenerating: false,
          generationProgress: ''
        })
        throw error
      }
    },

    sendChatMessage: async (message: string) => {
      try {
        const { files, messages, currentProject } = get()

        // Add user message immediately
        get().addMessage({
          role: 'user',
          content: message
        })

        // Set typing state
        get().setIsTyping(true)
        get().setStreamingMessage('')

        // Import chat service
        const { chatService } = await import('@/services/chatService')

        // Send message to chat service
        await chatService.sendStreamingMessage(
          {
            message,
            conversationHistory: [...messages, { role: 'user', content: message, id: 'temp', timestamp: new Date().toISOString() }],
            projectFiles: files,
            projectSettings: currentProject?.settings
          },
          {
            onChunk: (chunk: string) => {
              const currentMessage = get().streamingMessage || ''
              get().setStreamingMessage(currentMessage + chunk)
            },
            onComplete: async (fullMessage: string, response: GenerateResponse) => {
              // Add the assistant message
              get().addMessage({
                role: 'assistant',
                content: fullMessage,
                metadata: {
                  files: response.files,
                  operations: response.operations,
                  reasoning: response.reasoning,
                  confidence: response.confidence
                }
              })

              // Process any files generated
              if (response.files && response.files.length > 0) {
                response.files.forEach(file => {
                  get().addFile(file)
                })
              }

              // Clear streaming state
              get().setStreamingMessage(null)
              get().setIsTyping(false)

              // Auto-save after chat
              setTimeout(() => get().saveProject(), 1000)
            },
            onError: (error: Error) => {
              console.error('Chat error:', error)

              // Add error message
              get().addMessage({
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`
              })

              // Clear streaming state
              get().setStreamingMessage(null)
              get().setIsTyping(false)
            },
            onProgress: (progress: string) => {
              get().updateProject({
                description: progress
              })
            }
          }
        )

      } catch (error) {
        console.error('Send chat message error:', error)

        // Add error message
        get().addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })

        // Clear streaming state
        get().setStreamingMessage(null)
        get().setIsTyping(false)
      }
    },

    setStreamingMessage: (message: string | null) => {
      set({ streamingMessage: message })
    },

    setIsTyping: (isTyping: boolean) => {
      set({ isTyping })
    },

    clearChat: () => {
      set({
        messages: [],
        streamingMessage: null,
        isTyping: false
      })
    },

    // Contextual updates
    addContextualUpdate: async (contextData) => {
      const context: ContextItem = {
        id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...contextData,
        timestamp: Date.now(),
        applied: false
      }

      set(state => ({
        contextualUpdates: [...state.contextualUpdates, context]
      }))

      // Auto-process if high priority or critical
      if (context.priority === 'high' || context.priority === 'critical') {
        await get().processContextualUpdate(context.id)
      }
    },

    processContextualUpdate: async (contextId: string) => {
      try {
        const { contextualUpdates, files, messages } = get()
        const context = contextualUpdates.find(c => c.id === contextId)

        if (!context) throw new Error('Context not found')

        set({ isGenerating: true, generationProgress: 'Processing contextual update...' })

        const { processContextualUpdate } = await import('@/services/contextualUpdateService')
        const result = await processContextualUpdate(context, files, messages)

        if (result.success) {
          // Update files based on result
          result.operations?.forEach(op => {
            switch (op.type) {
              case 'create':
                if (op.file && op.content) {
                  get().addFile({
                    name: op.file,
                    type: 'javascript', // Default type
                    content: op.content,
                    language: 'javascript'
                  })
                }
                break
              case 'update':
                if (op.file && op.content) {
                  const existingFile = get().files.find(f => f.name === op.file)
                  if (existingFile) {
                    get().updateFile(existingFile.id, { content: op.content })
                  }
                }
                break
              case 'delete':
                const fileToDelete = get().files.find(f => f.name === op.file)
                if (fileToDelete) {
                  get().deleteFile(fileToDelete.id)
                }
                break
            }
          })

          // Mark context as applied
          set(state => ({
            contextualUpdates: state.contextualUpdates.map(c =>
              c.id === contextId ? { ...c, applied: true } : c
            )
          }))

          // Auto-save
          setTimeout(() => get().saveProject(), 1000)

        } else {
          throw new Error(result.error || 'Failed to process contextual update')
        }

        set({ isGenerating: false, generationProgress: '' })

      } catch (error) {
        console.error('Process contextual update error:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to process contextual update',
          isGenerating: false,
          generationProgress: ''
        })
        throw error
      }
    },

    // UI actions
    updateUIState: (updates) => {
      set(state => ({
        uiState: { ...state.uiState, ...updates }
      }))
    },

    // Utility
    clearError: () => set({ error: null }),

    resetState: () => ({
      currentProject: null,
      isLoading: false,
      isSaving: false,
      error: null,
      files: [],
      activeFileId: null,
      activeFile: null,
      messages: [],
      isGenerating: false,
      generationProgress: '',
      streamingMessage: null,
      isTyping: false,
      contextualUpdates: [],
      contextualUpdateQueue: [],
      uiState: createDefaultUIState()
    })
  }))
)

// Auto-save effect
useProjectStore.subscribe(
  (state) => ({
    files: state.files,
    messages: state.messages,
    currentProject: state.currentProject
  }),
  (currentState, previousState) => {
    // Only auto-save if there are actual changes and we have a project
    if (
      currentState.currentProject &&
      (JSON.stringify(currentState.files) !== JSON.stringify(previousState.files) ||
       JSON.stringify(currentState.messages) !== JSON.stringify(previousState.messages))
    ) {
      // Debounced auto-save
      const timeoutId = setTimeout(() => {
        useProjectStore.getState().saveProject()
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  },
  {
    equalityFn: (a, b) =>
      JSON.stringify(a.files) === JSON.stringify(b.files) &&
      JSON.stringify(a.messages) === JSON.stringify(b.messages) &&
      a.currentProject?.id === b.currentProject?.id
  }
)