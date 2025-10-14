import { Project, ProjectFile } from '@/types'
import { getUserProjects } from './projectService'

export interface SearchResult {
  id: string
  type: 'project' | 'file'
  projectId: string
  projectName: string
  title: string
  description?: string
  content?: string
  filePath?: string
  fileType?: string
  score: number
  highlights: string[]
}

export interface SearchOptions {
  includeFileContent?: boolean
  limit?: number
  userId?: string
}

/**
 * Search through user's projects by name, description, and file content
 */
export async function searchProjects(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    includeFileContent = true,
    limit = 10,
    userId
  } = options

  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    // Get all user projects
    const projects = userId ? await getUserProjects(userId) : []
    const results: SearchResult[] = []

    const searchTerms = query.toLowerCase().trim().split(/\s+/)

    for (const project of projects) {
      let projectScore = 0
      const projectHighlights: string[] = []

      // Search in project name
      const nameMatch = searchInText(project.name, searchTerms)
      if (nameMatch.match) {
        projectScore += nameMatch.score * 3 // Name matches are weighted higher
        projectHighlights.push(...nameMatch.highlights)
      }

      // Search in project description
      if (project.description) {
        const descMatch = searchInText(project.description, searchTerms)
        if (descMatch.match) {
          projectScore += descMatch.score * 2 // Description matches are weighted medium
          projectHighlights.push(...descMatch.highlights)
        }
      }

      // Search in project prompt
      if (project.prompt) {
        const promptMatch = searchInText(project.prompt, searchTerms)
        if (promptMatch.match) {
          projectScore += promptMatch.score * 1.5 // Prompt matches are weighted lower
          projectHighlights.push(...promptMatch.highlights)
        }
      }

      // Add project result if it has any matches
      if (projectScore > 0) {
        results.push({
          id: project.id,
          type: 'project',
          projectId: project.id,
          projectName: project.name,
          title: project.name,
          description: project.description,
          score: projectScore,
          highlights: [...new Set(projectHighlights)] // Remove duplicates
        })
      }

      // Search in file content if enabled
      if (includeFileContent && project.files) {
        for (const file of project.files) {
          const fileResult = searchInFile(file, searchTerms, project)
          if (fileResult) {
            results.push(fileResult)
          }
        }
      }
    }

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

/**
 * Search for matches in a text string
 */
function searchInText(text: string, searchTerms: string[]): {
  match: boolean
  score: number
  highlights: string[]
} {
  const lowerText = text.toLowerCase()
  let score = 0
  const highlights: string[] = []

  for (const term of searchTerms) {
    const termCount = (lowerText.match(new RegExp(term, 'g')) || []).length
    if (termCount > 0) {
      score += termCount

      // Create highlighted snippet
      const termIndex = lowerText.indexOf(term)
      if (termIndex !== -1) {
        const start = Math.max(0, termIndex - 30)
        const end = Math.min(text.length, termIndex + term.length + 30)
        let snippet = text.substring(start, end)

        if (start > 0) snippet = '...' + snippet
        if (end < text.length) snippet = snippet + '...'

        highlights.push(snippet)
      }
    }
  }

  return {
    match: score > 0,
    score,
    highlights
  }
}

/**
 * Search for matches in a file
 */
function searchInFile(
  file: ProjectFile,
  searchTerms: string[],
  project: Project
): SearchResult | null {
  if (!file.content) return null

  const searchResult = searchInText(file.content, searchTerms)
  if (!searchResult.match) return null

  return {
    id: `${project.id}-${file.id}`,
    type: 'file',
    projectId: project.id,
    projectName: project.name,
    title: file.name,
    description: `File in ${project.name}`,
    content: file.content,
    filePath: file.path || file.name,
    fileType: file.type,
    score: searchResult.score * 0.8, // File matches are weighted lower than project matches
    highlights: searchResult.highlights
  }
}

/**
 * Get search suggestions based on existing project names and descriptions
 */
export async function getSearchSuggestions(
  partialQuery: string,
  userId?: string,
  limit: number = 5
): Promise<string[]> {
  if (!partialQuery || partialQuery.length < 2 || !userId) {
    return []
  }

  try {
    const projects = await getUserProjects(userId)
    const suggestions = new Set<string>()
    const query = partialQuery.toLowerCase()

    for (const project of projects) {
      // Add project name if it matches
      if (project.name.toLowerCase().includes(query)) {
        suggestions.add(project.name)
      }

      // Add words from description
      if (project.description) {
        const words = project.description.toLowerCase().split(/\s+/)
        for (const word of words) {
          if (word.includes(query) && word.length > partialQuery.length) {
            suggestions.add(word)
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, limit)

  } catch (error) {
    console.error('Get suggestions error:', error)
    return []
  }
}