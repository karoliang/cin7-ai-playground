// API Client SDK for CIN7 AI Playground

import {
  APIResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListParams,
  ProjectListResponse,
  GenerateRequest,
  GenerateResponse,
  ChatRequest,
  ChatResponse,
  AIModel,
  AnalyzeRequest,
  AnalyzeResponse,
  CreateFileRequest,
  UpdateFileRequest,
  ProjectFile,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UserSettings,
  APIError as APIErrorType,
  APIClientOptions,
  RequestConfig,
  FileUploadOptions,
  ImportOptions,
  ImportProgress,
  ImportResult,
  BuildRequest,
  BuildResponse,
  SearchParams,
  SearchResult
} from '../types/api'

// Error classes
export class APIError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class NetworkError extends APIError {
  constructor(message: string, originalError?: Error) {
    super(message, 0, 'NETWORK_ERROR', { originalError: originalError?.message })
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends APIError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`, 408, 'TIMEOUT')
    this.name = 'TimeoutError'
  }
}

// Main API Client class
export class APIClient {
  private baseURL: string
  private timeout: number
  private retries: number
  private retryDelay: number
  private headers: Record<string, string>
  private authToken?: string
  private onAuthError?: () => void
  private onRateLimit?: (retryAfter: number) => void
  private onRequest?: (config: RequestConfig) => void
  private onResponse?: (response: Response) => void
  private onError?: (error: Error) => void
  private abortController?: AbortController

  constructor(options: APIClientOptions = {}) {
    this.baseURL = options.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 3
    this.retryDelay = options.retryDelay || 1000
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
    this.authToken = options.authToken
    this.onAuthError = options.onAuthError
    this.onRateLimit = options.onRateLimit
    this.onRequest = options.onRequest
    this.onResponse = options.onResponse
    this.onError = options.onError
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined
  }

  /**
   * Update default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestConfig = {
      timeout: this.timeout,
      retries: this.retries,
      retryDelay: this.retryDelay,
      ...options
    }

    // Set up abort controller for timeout
    this.abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      this.abortController?.abort()
    }, config.timeout)

    try {
      // Prepare headers
      const headers = new Headers(this.headers)
      if (this.authToken) {
        headers.set('Authorization', `Bearer ${this.authToken}`)
      }

      // Merge additional headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          headers.set(key, value)
        })
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        signal: this.abortController.signal,
        ...options
      }

      // Call request hook
      this.onRequest?.(config)

      // Make request with retries
      const response = await this.withRetry(
        () => fetch(url, requestOptions),
        config.retries,
        config.retryDelay
      )

      // Clear timeout
      clearTimeout(timeoutId)

      // Call response hook
      this.onResponse?.(response)

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        this.onRateLimit?.(retryAfter)
        throw new APIError('Rate limit exceeded', 429, 'RATE_LIMITED', { retryAfter })
      }

      // Handle authentication errors
      if (response.status === 401) {
        this.onAuthError?.()
        throw new APIError('Authentication required', 401, 'UNAUTHORIZED')
      }

      // Parse response
      const responseData = await this.parseResponse<T>(response)

      // Handle API errors
      if (!responseData.success) {
        throw new APIError(
          responseData.error || 'Unknown error',
          response.status,
          responseData.code || 'UNKNOWN_ERROR',
          responseData.details
        )
      }

      return responseData
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle different error types
      if (error instanceof APIError) {
        this.onError?.(error)
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(this.timeout)
        }

        if (error.message.includes('fetch')) {
          throw new NetworkError('Network error', error)
        }

        const apiError = new APIError(error.message, 500, 'UNKNOWN_ERROR')
        this.onError?.(apiError)
        throw apiError
      }

      throw new APIError('Unknown error occurred', 500, 'UNKNOWN_ERROR')
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx) or specific error types
        if (
          error instanceof APIError &&
          (error.statusCode < 500 || error.statusCode === 401 || error.statusCode === 403)
        ) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay * Math.pow(2, attempt))
      }
    }

    throw lastError!
  }

  /**
   * Parse response and handle different content types
   */
  private async parseResponse<T>(response: Response): Promise<APIResponse<T>> {
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      return response.json()
    }

    if (contentType?.includes('text/')) {
      const text = await response.text()
      return {
        success: true,
        data: text as unknown as T
      } as APIResponse<T>
    }

    if (contentType?.includes('application/octet-stream')) {
      const blob = await response.blob()
      return {
        success: true,
        data: blob as unknown as T
      } as APIResponse<T>
    }

    throw new APIError(`Unsupported content type: ${contentType}`, 415, 'UNSUPPORTED_MEDIA_TYPE')
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cancel current request
   */
  cancelRequest(): void {
    this.abortController?.abort()
  }

  // HTTP Methods
  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<APIResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint
    return this.request<T>(url, { method: 'GET' })
  }

  private async post<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  private async put<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  private async patch<T>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  private async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Project API
  async getProjects(params?: ProjectListParams): Promise<ProjectListResponse> {
    const response = await this.get<ProjectListResponse>('/projects', params)
    return response.data!
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await this.get<Project>(`/projects/${projectId}`)
    return response.data!
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await this.post<Project>('/projects', data)
    return response.data!
  }

  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await this.put<Project>(`/projects/${projectId}`, data)
    return response.data!
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.delete(`/projects/${projectId}`)
  }

  // AI API
  async generateCode(data: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.post<GenerateResponse>('/ai/generate', data)
    return response.data!
  }

  async chatWithAI(data: ChatRequest): Promise<ChatResponse> {
    const response = await this.post<ChatResponse>('/ai/chat', data)
    return response.data!
  }

  async getAIModels(): Promise<AIModel[]> {
    const response = await this.get<AIModel[]>('/ai/models')
    return response.data!
  }

  async analyzeCode(data: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await this.post<AnalyzeResponse>('/ai/analyze', data)
    return response.data!
  }

  // File API
  async getProjectFiles(projectId: string, params?: { type?: string }): Promise<ProjectFile[]> {
    const response = await this.get<ProjectFile[]>(`/projects/${projectId}/files`, params)
    return response.data!
  }

  async getProjectFile(projectId: string, fileId: string): Promise<ProjectFile> {
    const response = await this.get<ProjectFile>(`/projects/${projectId}/files/${fileId}`)
    return response.data!
  }

  async createProjectFile(projectId: string, data: CreateFileRequest): Promise<ProjectFile> {
    const response = await this.post<ProjectFile>(`/projects/${projectId}/files`, data)
    return response.data!
  }

  async updateProjectFile(projectId: string, fileId: string, data: UpdateFileRequest): Promise<ProjectFile> {
    const response = await this.put<ProjectFile>(`/projects/${projectId}/files/${fileId}`, data)
    return response.data!
  }

  async deleteProjectFile(projectId: string, fileId: string): Promise<void> {
    await this.delete(`/projects/${projectId}/files/${fileId}`)
  }

  async uploadFile(projectId: string, file: File, options?: FileUploadOptions): Promise<ProjectFile> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.request<ProjectFile>(`/projects/${projectId}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })

    return response.data!
  }

  // User API
  async getUserProfile(): Promise<any> {
    const response = await this.get<any>('/users/profile')
    return response.data!
  }

  async updateUserProfile(data: UpdateProfileRequest): Promise<any> {
    const response = await this.put<any>('/users/profile', data)
    return response.data!
  }

  async getUserSettings(): Promise<UserSettings> {
    const response = await this.get<UserSettings>('/users/settings')
    return response.data!
  }

  async updateUserSettings(data: UpdateSettingsRequest): Promise<UserSettings> {
    const response = await this.put<UserSettings>('/users/settings', data)
    return response.data!
  }

  // Search API
  async search(params: SearchParams): Promise<SearchResult<any>> {
    const response = await this.get<SearchResult<any>>('/search', params)
    return response.data!
  }

  // Import/Export API
  async importProject(data: ImportOptions, file?: File): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('options', JSON.stringify(data))
    if (file) {
      formData.append('file', file)
    }

    const response = await this.request<ImportResult>('/import', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })

    return response.data!
  }

  async exportProject(projectId: string, options?: { format?: string }): Promise<Blob> {
    const response = await this.request<Blob>(`/projects/${projectId}/export`, {
      method: 'POST',
      body: options ? JSON.stringify(options) : undefined
    })

    return response.data!
  }

  // Build API
  async buildProject(projectId: string, data?: BuildRequest): Promise<BuildResponse> {
    const response = await this.post<BuildResponse>(`/projects/${projectId}/build`, data)
    return response.data!
  }

  async getBuildStatus(projectId: string, buildId: string): Promise<BuildResponse> {
    const response = await this.get<BuildResponse>(`/projects/${projectId}/builds/${buildId}`)
    return response.data!
  }

  // Streaming API (for real-time updates)
  async *streamChat(data: ChatRequest): AsyncGenerator<ChatResponse> {
    const response = await fetch(`${this.baseURL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
        ...this.headers
      },
      body: JSON.stringify(data)
    })

    if (!response.body) {
      throw new APIError('Streaming not supported', 400, 'STREAMING_NOT_SUPPORTED')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              yield data
            } catch (error) {
              console.error('Error parsing streaming data:', error)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async *streamGeneration(data: GenerateRequest): AsyncGenerator<GenerateResponse> {
    const response = await fetch(`${this.baseURL}/ai/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
        ...this.headers
      },
      body: JSON.stringify(data)
    })

    if (!response.body) {
      throw new APIError('Streaming not supported', 400, 'STREAMING_NOT_SUPPORTED')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              yield data
            } catch (error) {
              console.error('Error parsing streaming data:', error)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.get<{ status: string; timestamp: string }>('/health')
    return response.data!
  }

  // Metrics
  async getMetrics(): Promise<any> {
    const response = await this.get<any>('/metrics')
    return response.data!
  }
}

// Create default API client instance
export const apiClient = new APIClient()

// Export convenience functions
export const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  generateCode,
  chatWithAI,
  getAIModels,
  analyzeCode,
  getProjectFiles,
  getProjectFile,
  createProjectFile,
  updateProjectFile,
  deleteProjectFile,
  uploadFile,
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
  search,
  importProject,
  exportProject,
  buildProject,
  getBuildStatus,
  healthCheck,
  getMetrics
} = apiClient

// Export streaming functions
export const { streamChat, streamGeneration } = apiClient

// React hook for using the API client
export function useAPIClient() {
  return apiClient
}

// Export types
export type {
  APIResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListParams,
  ProjectListResponse,
  GenerateRequest,
  GenerateResponse,
  ChatRequest,
  ChatResponse,
  AIModel,
  AnalyzeRequest,
  AnalyzeResponse,
  CreateFileRequest,
  UpdateFileRequest,
  ProjectFile,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UserSettings,
  APIClientOptions,
  RequestConfig,
  FileUploadOptions,
  ImportOptions,
  ImportProgress,
  ImportResult,
  BuildRequest,
  BuildResponse,
  SearchParams,
  SearchResult
}