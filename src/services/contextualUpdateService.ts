import { ContextItem, ProjectFile, ChatMessage } from '@/types'
import { processContextualUpdate as processContextualUpdateFromAI } from './aiService'

export async function processContextualUpdate(
  context: ContextItem,
  files: ProjectFile[],
  messages: ChatMessage[]
): Promise<any> {
  try {
    const result = await processContextualUpdateFromAI(context, files, messages)
    return result
  } catch (error) {
    console.error('Contextual update service error:', error)
    throw error
  }
}

// Context validation functions
export function validateContextItem(context: ContextItem): boolean {
  if (!context.id || !context.content || !context.type) {
    return false
  }

  const validTypes = ['instruction', 'file', 'constraint', 'example']
  if (!validTypes.includes(context.type)) {
    return false
  }

  const validPriorities = ['low', 'medium', 'high', 'critical']
  if (!validPriorities.includes(context.priority)) {
    return false
  }

  const validScopes = ['global', 'file-specific', 'component', 'page']
  if (!validScopes.includes(context.scope)) {
    return false
  }

  return true
}

export function prioritizeContextItems(items: ContextItem[]): ContextItem[] {
  const priorityWeight = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }

  return items.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
}

export function filterContextByScope(items: ContextItem[], scope: string, target?: string): ContextItem[] {
  return items.filter(item => {
    if (item.scope === 'global') return true
    if (item.scope === scope) return true
    if (item.target_files && target) {
      return item.target_files.includes(target)
    }
    return false
  })
}