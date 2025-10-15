# API Examples

This document provides practical examples of using the CIN7 AI Playground API for common use cases.

## Table of Contents

- [Authentication](#authentication)
- [Project Management](#project-management)
- [AI Integration](#ai-integration)
- [File Operations](#file-operations)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)

## Authentication

### Basic Authentication

```javascript
import { APIClient } from '@cin7-ai-playground/api-client'

const client = new APIClient({
  baseURL: 'https://api.cin7-ai-playground.com/v1',
  authToken: 'your-jwt-token'
})

// Or set token later
client.setAuthToken('your-jwt-token')
```

### Token Refresh

```javascript
const client = new APIClient({
  onAuthError: () => {
    // Handle token refresh
    refreshToken().then(newToken => {
      client.setAuthToken(newToken)
    })
  }
})
```

### Error Handling

```javascript
try {
  const projects = await client.getProjects()
} catch (error) {
  if (error.statusCode === 401) {
    // Handle authentication error
    console.log('Authentication required')
  } else if (error.statusCode === 429) {
    // Handle rate limiting
    console.log(`Rate limited. Retry after ${error.details.retry_after} seconds`)
  } else {
    console.error('API Error:', error.message)
  }
}
```

## Project Management

### List Projects with Pagination

```javascript
async function listAllProjects() {
  let allProjects = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await client.getProjects({
      page,
      limit: 50,
      sort: 'updated_at',
      order: 'desc'
    })

    allProjects = allProjects.concat(response.projects)
    hasMore = response.pagination.has_next
    page++
  }

  return allProjects
}

// Usage
const projects = await listAllProjects()
console.log(`Found ${projects.length} projects`)
```

### Search Projects

```javascript
const searchResults = await client.getProjects({
  search: 'e-commerce',
  status: 'active',
  limit: 10
})

console.log('Found projects:', searchResults.projects)
```

### Create a Project with Template

```javascript
const project = await client.createProject({
  name: 'My E-commerce Site',
  description: 'A modern e-commerce website with React',
  framework: 'react',
  template: 'e-commerce',
  settings: {
    theme: {
      mode: 'dark',
      primary_color: '#3b82f6'
    },
    ai: {
      model: 'gpt-4',
      temperature: 0.7,
      auto_suggestions: true
    }
  }
})

console.log('Created project:', project.id)
```

### Update Project Settings

```javascript
const updatedProject = await client.updateProject(project.id, {
  settings: {
    theme: {
      mode: 'light',
      primary_color: '#10b981'
    },
    preview: {
      auto_refresh: true,
      device: 'mobile'
    }
  }
})
```

### Delete Project with Confirmation

```javascript
async function deleteProjectSafely(projectId) {
  // First, get project details
  const project = await client.getProject(projectId)

  // Confirm deletion
  const confirmed = confirm(`Are you sure you want to delete "${project.name}"?`)

  if (confirmed) {
    await client.deleteProject(projectId)
    console.log(`Project "${project.name}" deleted successfully`)
  }
}
```

## AI Integration

### Generate Code for a Project

```javascript
async function generateFeature(projectId, feature) {
  try {
    const response = await client.generateCode({
      prompt: `Create a ${feature} component`,
      context: {
        project_id: projectId,
        framework: 'react'
      },
      options: {
        temperature: 0.7,
        include_tests: true,
        include_docs: true
      }
    })

    // Create files from generated code
    for (const file of response.files) {
      await client.createProjectFile(projectId, {
        name: file.name,
        type: file.type,
        content: file.content,
        path: file.path
      })
    }

    console.log(`Generated ${response.files.length} files`)
    return response
  } catch (error) {
    console.error('Code generation failed:', error)
    throw error
  }
}

// Usage
const result = await generateFeature('project-123', 'user authentication')
```

### Streaming Chat with AI

```javascript
async function streamChat(projectId, message) {
  console.log('AI:', '')

  try {
    for await (const chunk of client.streamChat({
      message,
      project_id: projectId,
      stream: true
    })) {
      // Stream the response
      process.stdout.write(chunk.message)

      // Handle suggestions
      if (chunk.suggestions && chunk.suggestions.length > 0) {
        console.log('\nSuggestions:', chunk.suggestions)
      }
    }
    console.log('\n')
  } catch (error) {
    console.error('Chat failed:', error)
  }
}

// Usage
await streamChat('project-123', 'How do I add routing to my React app?')
```

### Analyze Code for Issues

```javascript
async function analyzeProjectCode(projectId) {
  // Get all project files
  const files = await client.getProjectFiles(projectId)

  const analysisResults = []

  for (const file of files) {
    if (['javascript', 'typescript', 'jsx', 'tsx'].includes(file.type)) {
      try {
        const analysis = await client.analyzeCode({
          code: file.content,
          file_path: file.path,
          language: file.type,
          analysis_type: 'all'
        })

        analysisResults.push({
          file: file.name,
          issues: analysis.issues,
          suggestions: analysis.suggestions,
          metrics: analysis.metrics
        })
      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error)
      }
    }
  }

  return analysisResults
}

// Usage
const results = await analyzeProjectCode('project-123')
results.forEach(result => {
  console.log(`File: ${result.file}`)
  console.log(`Issues: ${result.issues.length}`)
  console.log(`Suggestions: ${result.suggestions.length}`)
})
```

### Batch AI Operations

```javascript
async function batchGenerate(projectId, features) {
  const results = []

  for (const feature of features) {
    try {
      console.log(`Generating ${feature}...`)
      const result = await generateFeature(projectId, feature)
      results.push({ feature, success: true, result })

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`Failed to generate ${feature}:`, error)
      results.push({ feature, success: false, error: error.message })
    }
  }

  return results
}

// Usage
const features = ['navbar', 'footer', 'sidebar', 'modal']
const results = await batchGenerate('project-123', features)
```

## File Operations

### Upload Multiple Files

```javascript
async function uploadMultipleFiles(projectId, files) {
  const uploadPromises = files.map(async (file) => {
    try {
      const uploadedFile = await client.uploadFile(projectId, file, {
        onProgress: (progress) => {
          console.log(`Uploading ${file.name}: ${progress.percentage}%`)
        }
      })
      return { file: file.name, success: true, uploadedFile }
    } catch (error) {
      return { file: file.name, success: false, error: error.message }
    }
  })

  const results = await Promise.all(uploadPromises)

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`Successfully uploaded ${successful.length} files`)
  if (failed.length > 0) {
    console.log(`Failed to upload ${failed.length} files:`, failed)
  }

  return results
}

// Usage
const fileInput = document.getElementById('file-input')
const files = Array.from(fileInput.files)
const results = await uploadMultipleFiles('project-123', files)
```

### Create File with Validation

```javascript
async function createValidatedFile(projectId, fileData) {
  // Validate file data
  if (!fileData.name || !fileData.content || !fileData.type) {
    throw new Error('Missing required file fields: name, content, type')
  }

  // Check file size
  if (fileData.content.length > 1000000) { // 1MB limit
    throw new Error('File content too large (max 1MB)')
  }

  // Validate file name
  const validName = /^[a-zA-Z0-9\-_.]+$/.test(fileData.name)
  if (!validName) {
    throw new Error('Invalid file name. Use only letters, numbers, hyphens, underscores, and dots')
  }

  try {
    const file = await client.createProjectFile(projectId, fileData)
    console.log(`Created file: ${file.name}`)
    return file
  } catch (error) {
    console.error(`Failed to create file ${fileData.name}:`, error)
    throw error
  }
}

// Usage
const newFile = await createValidatedFile('project-123', {
  name: 'components/Button.jsx',
  type: 'jsx',
  content: 'export const Button = () => <button>Click me</button>',
  path: '/src/components/Button.jsx'
})
```

### Export Project

```javascript
async function exportProject(projectId, format = 'zip') {
  try {
    console.log('Exporting project...')
    const blob = await client.exportProject(projectId, { format })

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-${projectId}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`Project exported as ${format}`)
  } catch (error) {
    console.error('Export failed:', error)
  }
}

// Usage
await exportProject('project-123', 'zip')
```

## Error Handling

### Retry Logic with Exponential Backoff

```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (error.statusCode === 429) {
        // Handle rate limiting with provided retry-after
        const retryAfter = error.details?.retry_after || 60
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }

      if (error.statusCode >= 500 && attempt < maxRetries) {
        // Retry server errors with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Server error. Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Don't retry client errors or on final attempt
      throw error
    }
  }
}

// Usage
const projects = await withRetry(() => client.getProjects())
```

### Comprehensive Error Handler

```javascript
class APIHandler {
  constructor(client) {
    this.client = client
    this.setupErrorHandling()
  }

  setupErrorHandling() {
    this.client.onError = (error) => {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      })
    }

    this.client.onRateLimit = (retryAfter) => {
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`)
      // Could show user notification
    }

    this.client.onAuthError = () => {
      console.warn('Authentication error. Token may be expired.')
      // Could redirect to login or refresh token
    }
  }

  async getProjects() {
    try {
      return await this.client.getProjects()
    } catch (error) {
      this.handleAPIError(error)
      throw error
    }
  }

  handleAPIError(error) {
    switch (error.statusCode) {
      case 400:
        console.error('Bad request:', error.details)
        break
      case 401:
        console.error('Authentication required')
        break
      case 403:
        console.error('Insufficient permissions')
        break
      case 404:
        console.error('Resource not found')
        break
      case 422:
        console.error('Validation error:', error.details)
        break
      case 429:
        console.error('Rate limit exceeded:', error.details?.retry_after)
        break
      case 500:
        console.error('Server error. Please try again later.')
        break
      default:
        console.error('Unknown error:', error.message)
    }
  }
}

// Usage
const handler = new APIHandler(client)
const projects = await handler.getProjects()
```

## Advanced Patterns

### Progress Tracking for Long Operations

```javascript
class ProgressTracker {
  constructor() {
    this.operations = new Map()
  }

  startOperation(id, description) {
    this.operations.set(id, {
      description,
      startTime: Date.now(),
      status: 'running',
      progress: 0
    })
  }

  updateProgress(id, progress, message) {
    const operation = this.operations.get(id)
    if (operation) {
      operation.progress = progress
      operation.message = message
      this.notifyProgress(id, operation)
    }
  }

  completeOperation(id, result) {
    const operation = this.operations.get(id)
    if (operation) {
      operation.status = 'completed'
      operation.endTime = Date.now()
      operation.result = result
      this.notifyComplete(id, operation)
    }
  }

  failOperation(id, error) {
    const operation = this.operations.get(id)
    if (operation) {
      operation.status = 'failed'
      operation.endTime = Date.now()
      operation.error = error
      this.notifyError(id, operation)
    }
  }

  notifyProgress(id, operation) {
    console.log(`${operation.description}: ${operation.progress}% - ${operation.message}`)
  }

  notifyComplete(id, operation) {
    const duration = operation.endTime - operation.startTime
    console.log(`${operation.description} completed in ${duration}ms`)
  }

  notifyError(id, operation) {
    console.error(`${operation.description} failed:`, operation.error)
  }
}

// Usage with file upload
const tracker = new ProgressTracker()
const operationId = 'upload-files'

tracker.startOperation(operationId, 'Uploading files')

for (let i = 0; i < files.length; i++) {
  tracker.updateProgress(operationId, (i / files.length) * 100, `Uploading ${files[i].name}`)
  await client.uploadFile(projectId, files[i])
}

tracker.completeOperation(operationId, { uploadedCount: files.length })
```

### Caching API Responses

```javascript
class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map()
    this.ttl = ttl
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear() {
    this.cache.clear()
  }
}

class CachedAPIClient {
  constructor(client) {
    this.client = client
    this.cache = new APICache()
  }

  async getProjects(params = {}) {
    const cacheKey = `projects:${JSON.stringify(params)}`
    let projects = this.cache.get(cacheKey)

    if (!projects) {
      projects = await this.client.getProjects(params)
      this.cache.set(cacheKey, projects)
    }

    return projects
  }

  async getProject(projectId) {
    const cacheKey = `project:${projectId}`
    let project = this.cache.get(cacheKey)

    if (!project) {
      project = await this.client.getProject(projectId)
      this.cache.set(cacheKey, project)
    }

    return project
  }

  invalidateProject(projectId) {
    // Clear project cache
    this.cache.cache.delete(`project:${projectId}`)

    // Clear projects list cache
    this.cache.clear()
  }
}

// Usage
const cachedClient = new CachedAPIClient(client)
const projects = await cachedClient.getProjects() // From API
const projectsAgain = await cachedClient.getProjects() // From cache
```

### Batch Operations

```javascript
class BatchProcessor {
  constructor(client, batchSize = 5, delay = 1000) {
    this.client = client
    this.batchSize = batchSize
    this.delay = delay
  }

  async processBatches(items, processor) {
    const results = []

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize)
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)}`)

      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      )

      results.push(...batchResults)

      // Add delay between batches to respect rate limits
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, this.delay))
      }
    }

    return results
  }
}

// Usage with file operations
const processor = new BatchProcessor(client, 3, 2000)

const files = [
  { name: 'file1.js', content: '...', type: 'javascript' },
  { name: 'file2.css', content: '...', type: 'css' },
  // ... more files
]

const results = await processor.processBatches(files, async (file) => {
  return await client.createProjectFile('project-123', file)
})

const successful = results.filter(r => r.status === 'fulfilled')
const failed = results.filter(r => r.status === 'rejected')

console.log(`Created ${successful.length} files, ${failed.length} failed`)
```

These examples demonstrate common patterns and best practices for using the CIN7 AI Playground API. Adapt them to your specific use case and requirements.