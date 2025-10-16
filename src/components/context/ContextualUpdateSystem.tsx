import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { ContextItem, ContextualUpdateRequest, EnhancedContext, UpdateStrategy, ContextMetrics } from '@/types'
import { useProjectStore } from '@/stores/projectStore'
import { generateCodeWithAI } from '@/services/aiService'
import { safeCreateContext, safeUseContext, validateReactContext, debugContextInfo } from '@/utils/reactContextSafety'

interface ContextualUpdateContextType {
  // State
  contextualUpdates: ContextItem[]
  isProcessingUpdate: boolean
  updateQueue: (() => Promise<void>)[]
  contextMetrics: ContextMetrics

  // Actions
  addContext: (content: string, options?: AddContextOptions) => Promise<void>
  processContextualUpdate: (contextId: string) => Promise<void>
  clearAppliedContext: () => number
  getContextState: () => ContextState
  onContextChange: (listener: ContextChangeListener) => () => void
}

interface AddContextOptions {
  type?: 'instruction' | 'file' | 'constraint' | 'example'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  scope?: 'global' | 'file-specific' | 'component' | 'page'
  forceUpdate?: boolean
  targetFiles?: string[]
}

interface ContextState {
  contextualUpdates: ContextItem[]
  lastUpdate: number | null
  changesSinceLastGen: boolean
}

type ContextChangeEvent =
  | { type: 'contextAdded'; data: ContextItem }
  | { type: 'updateComplete'; data: { context: ContextItem; result: any; strategy: UpdateStrategy } }
  | { type: 'filesChanged'; data: { previousCount: number; currentCount: number } }

type ContextChangeListener = (event: ContextChangeEvent) => void

// Use safe context creation with validation
const ContextualUpdateContext = safeCreateContext<ContextualUpdateContextType | undefined>(undefined)

// Validate React context availability
if (process.env.NODE_ENV === 'development') {
  debugContextInfo('ContextualUpdateSystem')
  validateReactContext()
}

export const useContextualUpdate = () => {
  try {
    const context = safeUseContext(ContextualUpdateContext)
    if (!context) {
      throw new Error('useContextualUpdate must be used within a ContextualUpdateProvider')
    }
    return context
  } catch (error) {
    console.error('Error in useContextualUpdate hook:', error)

    // Fallback values in case of context failure
    return {
      contextualUpdates: [],
      isProcessingUpdate: false,
      updateQueue: [],
      contextMetrics: {
        total_instructions: 0,
        unapplied_instructions: 0,
        last_update: Date.now(),
        changes_since_last_gen: false
      },
      addContext: async () => {},
      processContextualUpdate: async () => {},
      clearAppliedContext: () => 0,
      getContextState: () => ({
        contextualUpdates: [],
        lastUpdate: null,
        changesSinceLastGen: false
      }),
      onContextChange: () => () => {}
    }
  }
}

export const ContextualUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentProject, files, messages, addFile, updateFile, deleteFile } = useProjectStore()

  // State
  const [contextualUpdates, setContextualUpdates] = useState<ContextItem[]>([])
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false)
  const [updateQueue, setUpdateQueue] = useState<(() => Promise<void>)[]>([])
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [changesSinceLastGen, setChangesSinceLastGen] = useState(false)
  const listenersRef = useRef<Set<ContextChangeListener>>(new Set())

  // Refs for project synchronization
  const projectRef = useRef(currentProject)

  // Update project reference when it changes
  useEffect(() => {
    if (currentProject) {
      projectRef.current = currentProject
      console.log('🔄 ContextualUpdateSystem: Project reference updated', {
        projectId: currentProject.id,
        filesCount: currentProject.files?.length || 0
      })
    }
  }, [currentProject])

  // Calculate context metrics
  const contextMetrics: ContextMetrics = {
    total_instructions: contextualUpdates.length,
    unapplied_instructions: contextualUpdates.filter(ctx => !ctx.applied).length,
    last_update: lastUpdate || Date.now(),
    changes_since_last_gen: changesSinceLastGen
  }

  // Generate unique context ID
  const generateContextId = useCallback(() => {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }, [])

  // Get priority weight for sorting
  const priorityWeight = useCallback((priority: string) => {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 }
    return weights[priority as keyof typeof weights] || 1
  }, [])

  // Add new context
  const addContext = useCallback(async (
    content: string,
    options: AddContextOptions = {}
  ) => {
    const {
      type = 'instruction',
      priority = 'medium',
      scope = 'global',
      forceUpdate = true,
      targetFiles = null
    } = options

    const context: ContextItem = {
      id: generateContextId(),
      type,
      content,
      priority,
      scope,
      target_files: targetFiles,
      timestamp: Date.now(),
      applied: false
    }

    console.log('📝 Adding context:', {
      id: context.id,
      type,
      priority,
      scope,
      forceUpdate
    })

    // Add to state
    setContextualUpdates(prev => [...prev, context])
    setChangesSinceLastGen(true)
    setLastUpdate(Date.now())

    // Notify listeners
    listenersRef.current.forEach(listener => {
      try {
        listener({ type: 'contextAdded', data: context })
      } catch (error) {
        console.error('❌ Error in context listener:', error)
      }
    })

    // Force update if requested
    if (forceUpdate) {
      await processContextualUpdate(context.id)
    }
  }, [generateContextId])

  // Process contextual update
  const processContextualUpdate = useCallback(async (contextId: string) => {
    if (isProcessingUpdate) {
      console.warn('⚠️ Update already in progress, queuing request')
      return new Promise<void>((resolve) => {
        setUpdateQueue(prev => [...prev, () => Promise.resolve().then(resolve)])
      })
    }

    setIsProcessingUpdate(true)

    try {
      const context = contextualUpdates.find(c => c.id === contextId)
      if (!context) {
        throw new Error('Context not found')
      }

      console.log('🚀 Processing contextual update:', {
        contextId: context.id,
        queueLength: updateQueue.length,
        changesSinceLastGen
      })

      // Prepare enhanced context
      const enhancedContext = await prepareEnhancedContext(context)

      // Determine update strategy
      const updateStrategy = determineUpdateStrategy(context, enhancedContext)

      // Execute contextual update
      const result = await executeContextualUpdate(enhancedContext, updateStrategy)

      if (result.success) {
        // Mark context as applied
        setContextualUpdates(prev =>
          prev.map(c => c.id === contextId ? { ...c, applied: true } : c)
        )

        setChangesSinceLastGen(false)
        setLastUpdate(Date.now())

        // Apply file operations
        if (result.operations) {
          for (const operation of result.operations) {
            await applyFileOperation(operation)
          }
        }

        // Notify listeners
        listenersRef.current.forEach(listener => {
          try {
            listener({
              type: 'updateComplete',
              data: { context, result, strategy: updateStrategy }
            })
          } catch (error) {
            console.error('❌ Error in context listener:', error)
          }
        })

        console.log('✅ Contextual update completed:', {
          filesAffected: result.operations?.length || 0,
          strategy: updateStrategy.type
        })
      } else {
        throw new Error(result.error || 'Contextual update failed')
      }

    } catch (error) {
      console.error('❌ Contextual update failed:', error)
      throw error
    } finally {
      setIsProcessingUpdate(false)

      // Process queued updates
      if (updateQueue.length > 0) {
        const queuedResolvers = [...updateQueue]
        setUpdateQueue([])

        // Execute next update for all queued requests
        const nextUpdate = async () => {
          const nextResult = await processContextualUpdate(contextId)
          queuedResolvers.forEach(resolve => resolve())
        }
        nextUpdate().catch(console.error)
      }
    }
  }, [contextualUpdates, isProcessingUpdate, updateQueue, changesSinceLastGen, files, messages])

  // Prepare enhanced context for API call
  const prepareEnhancedContext = useCallback(async (triggerContext: ContextItem): Promise<EnhancedContext> => {
    console.log('🔍 Preparing enhanced context:', {
      triggerContextId: triggerContext.id,
      filesCount: files.length,
      messagesCount: messages.length
    })

    // Get unapplied instructions sorted by priority
    const unappliedInstructions = contextualUpdates
      .filter(ctx => !ctx.applied)
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))

    // Build contextual prompt
    const prompt = buildContextualPrompt(triggerContext, unappliedInstructions)

    const enhancedContext: EnhancedContext = {
      prompt,
      mode: 'contextual-update',
      existing_files: files,
      chat_history: messages,
      contextual_instructions: unappliedInstructions,
      project_metadata: {
        name: projectRef.current?.name || 'Contextual Update Project',
        version: '2.0.0',
        last_modified: new Date().toISOString()
      },
      update_trigger: {
        id: triggerContext.id,
        type: triggerContext.type,
        content: triggerContext.content,
        priority: triggerContext.priority,
        scope: triggerContext.scope,
        target_files: triggerContext.target_files,
        timestamp: triggerContext.timestamp,
        applied: triggerContext.applied
      },
      context_metrics: contextMetrics
    }

    console.log('🔧 Enhanced context prepared:', {
      promptLength: prompt.length,
      existingFiles: enhancedContext.existing_files.length,
      contextualInstructions: enhancedContext.contextual_instructions.length
    })

    return enhancedContext
  }, [contextualUpdates, files, messages, priorityWeight, contextMetrics])

  // Build contextual prompt
  const buildContextualPrompt = useCallback((
    triggerContext: ContextItem,
    unappliedInstructions: ContextItem[]
  ): string => {
    let prompt = ''

    // Start with trigger context
    prompt += `CONTEXTUAL UPDATE REQUEST:\n`
    prompt += `Type: ${triggerContext.type}\n`
    prompt += `Priority: ${triggerContext.priority}\n`
    prompt += `Scope: ${triggerContext.scope}\n`
    prompt += `Instruction: ${triggerContext.content}\n\n`

    // Add accumulated context instructions
    if (unappliedInstructions.length > 0) {
      prompt += `ADDITIONAL CONTEXT INSTRUCTIONS:\n`
      unappliedInstructions.forEach((ctx, index) => {
        prompt += `${index + 1}. [${ctx.priority.toUpperCase()}] ${ctx.content}`
        if (ctx.scope !== 'global') {
          prompt += ` (Scope: ${ctx.scope})`
        }
        if (ctx.target_files) {
          prompt += ` (Target files: ${ctx.target_files.join(', ')})`
        }
        prompt += '\n'
      })
      prompt += '\n'
    }

    // Add modification guidelines
    prompt += `MODIFICATION GUIDELINES:\n`
    prompt += `- Only modify code that is directly relevant to the context provided\n`
    prompt += `- Preserve existing functionality unless explicitly instructed to change it\n`
    prompt += `- Maintain code quality and consistency with existing patterns\n`
    prompt += `- Focus on targeted improvements rather than wholesale changes\n`
    prompt += `- Use CIN7 design system and Polaris components where applicable\n`
    prompt += `- Provide clear reasoning for any modifications made\n\n`

    return prompt
  }, [])

  // Determine update strategy
  const determineUpdateStrategy = useCallback((
    triggerContext: ContextItem,
    enhancedContext: EnhancedContext
  ): UpdateStrategy => {
    const strategy: UpdateStrategy = {
      type: 'selective',
      confidence: 0.8,
      reasoning: []
    }

    // Check trigger context scope
    switch (triggerContext.scope) {
      case 'file-specific':
        strategy.type = 'targeted'
        strategy.target_files = triggerContext.target_files
        strategy.reasoning.push('File-specific scope detected')
        break
      case 'component':
        strategy.type = 'selective'
        strategy.reasoning.push('Component-level scope detected')
        break
      case 'global':
      default:
        strategy.type = 'selective'
        strategy.reasoning.push('Global scope - using selective strategy')
        break
    }

    // Consider priority
    const highPriorityInstructions = enhancedContext.contextual_instructions
      .filter(ctx => ctx.priority === 'critical' || ctx.priority === 'high')

    if (highPriorityInstructions.length > 0) {
      strategy.confidence = Math.min(1.0, strategy.confidence + 0.1)
      strategy.reasoning.push('High priority instructions present')
    }

    // Consider project size
    if (enhancedContext.existing_files.length > 10) {
      // Always keep selective or targeted for large projects
      strategy.reasoning.push('Large project - using targeted approach')
    }

    console.log('🎯 Update strategy determined:', strategy)
    return strategy
  }, [])

  // Execute contextual update
  const executeContextualUpdate = useCallback(async (
    enhancedContext: EnhancedContext,
    strategy: UpdateStrategy
  ) => {
    try {
      console.log('🔄 Executing contextual update with strategy:', strategy.type)

      // Use AI service for contextual update
      const request = {
        prompt: enhancedContext.prompt,
        existing_files: enhancedContext.existing_files,
        chat_history: enhancedContext.chat_history,
        context: {
          project_id: projectRef.current?.id,
          framework: enhancedContext.project_metadata.framework,
          template: enhancedContext.project_metadata.template,
          architecture: enhancedContext.project_metadata.architecture,
          constraints: enhancedContext.contextual_instructions.map(ctx => ctx.content)
        },
        options: {
          temperature: 0.7,
          max_tokens: 4000
        }
      }

      const result = await generateCodeWithAI(request)

      return {
        success: result.success,
        files: result.files || [],
        operations: result.operations || [],
        reasoning: result.reasoning,
        strategy: strategy.type
      }

    } catch (error) {
      console.error('❌ Contextual update execution failed:', error)
      return {
        success: false,
        files: [],
        operations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        strategy: strategy.type
      }
    }
  }, [])

  // Apply file operations
  const applyFileOperation = useCallback(async (operation: any) => {
    try {
      switch (operation.type) {
        case 'create':
          if (operation.file && operation.content) {
            addFile({
              name: operation.file,
              type: 'javascript',
              content: operation.content,
              language: 'javascript'
            })
          }
          break
        case 'update':
          if (operation.file && operation.content) {
            const existingFile = files.find(f => f.name === operation.file)
            if (existingFile) {
              updateFile(existingFile.id, { content: operation.content })
            }
          }
          break
        case 'delete':
          const fileToDelete = files.find(f => f.name === operation.file)
          if (fileToDelete) {
            deleteFile(fileToDelete.id)
          }
          break
      }
    } catch (error) {
      console.error('❌ Failed to apply file operation:', error)
    }
  }, [files, addFile, updateFile, deleteFile])

  // Clear applied context
  const clearAppliedContext = useCallback((): number => {
    const beforeCount = contextualUpdates.length
    const afterCount = contextualUpdates.filter(ctx => !ctx.applied).length

    setContextualUpdates(prev => prev.filter(ctx => !ctx.applied))

    console.log(`🧹 Cleared ${beforeCount - afterCount} applied context instructions`)
    return beforeCount - afterCount
  }, [contextualUpdates])

  // Get context state
  const getContextState = useCallback((): ContextState => ({
    contextualUpdates,
    lastUpdate,
    changesSinceLastGen
  }), [contextualUpdates, lastUpdate, changesSinceLastGen])

  // Add context change listener
  const onContextChange = useCallback((listener: ContextChangeListener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  // Monitor file changes
  useEffect(() => {
    const previousFilesLength = useRef(files.length)

    const checkFileChanges = () => {
      if (files.length !== previousFilesLength.current) {
        setChangesSinceLastGen(true)
        listenersRef.current.forEach(listener => {
          try {
            listener({
              type: 'filesChanged',
              data: {
                previousCount: previousFilesLength.current,
                currentCount: files.length
              }
            })
          } catch (error) {
            console.error('❌ Error in context listener:', error)
          }
        })
        previousFilesLength.current = files.length
      }
    }

    const interval = setInterval(checkFileChanges, 2000)
    return () => clearInterval(interval)
  }, [files])

  const value: ContextualUpdateContextType = {
    contextualUpdates,
    isProcessingUpdate,
    updateQueue,
    contextMetrics,
    addContext,
    processContextualUpdate,
    clearAppliedContext,
    getContextState,
    onContextChange
  }

  return (
    <ContextualUpdateContext.Provider value={value}>
      {children}
    </ContextualUpdateContext.Provider>
  )
}