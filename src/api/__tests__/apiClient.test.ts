// API Client tests

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIClient, APIError, NetworkError, TimeoutError } from '../lib/apiClient'
import { createMockFetch, mockRequest, mockResponse, mockAuthContext } from './utils/testHelpers'

describe('APIClient', () => {
  let client: APIClient
  let mockFetch: ReturnType<typeof createMockFetch>

  beforeEach(() => {
    mockFetch = createMockFetch([
      {
        url: '/test',
        response: { success: true, data: 'test', timestamp: new Date().toISOString() }
      },
      {
        url: '/projects',
        response: {
          success: true,
          data: {
            projects: [],
            pagination: { page: 1, limit: 20, total: 0, total_pages: 0, has_next: false, has_prev: false }
          },
          timestamp: new Date().toISOString()
        }
      },
      {
        url: '/error',
        response: { success: false, error: 'Test error', code: 'TEST_ERROR' },
        status: 400
      },
      {
        url: '/rate-limit',
        response: { success: false, error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
        status: 429,
        headers: { 'Retry-After': '60' }
      },
      {
        url: '/unauthorized',
        response: { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        status: 401
      }
    ])

    global.fetch = mockFetch
    client = new APIClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      retries: 2,
      retryDelay: 100
    })
  })

  describe('constructor', () => {
    it('should create client with default options', () => {
      const defaultClient = new APIClient()
      expect(defaultClient['baseURL']).toBe('http://localhost:3000/api/v1')
      expect(defaultClient['timeout']).toBe(30000)
      expect(defaultClient['retries']).toBe(3)
    })

    it('should create client with custom options', () => {
      const customClient = new APIClient({
        baseURL: 'https://custom.api.com',
        timeout: 10000,
        retries: 5,
        headers: { 'Custom-Header': 'value' }
      })

      expect(customClient['baseURL']).toBe('https://custom.api.com')
      expect(customClient['timeout']).toBe(10000)
      expect(customClient['retries']).toBe(5)
      expect(customClient['headers']['Custom-Header']).toBe('value')
    })
  })

  describe('authentication', () => {
    it('should set and get auth token', () => {
      const token = 'test-token'
      client.setAuthToken(token)
      expect(client['authToken']).toBe(token)
    })

    it('should clear auth token', () => {
      client.setAuthToken('test-token')
      client.clearAuthToken()
      expect(client['authToken']).toBeUndefined()
    })

    it('should include auth token in requests', async () => {
      client.setAuthToken('test-token')
      await client.request('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      )

      const call = mockFetch.mock.calls[0]
    })
  })

  describe('request handling', () => {
    it('should make successful GET request', async () => {
      const response = await client.request('/test')

      expect(response.success).toBe(true)
      expect(response.data).toBe('test')
      expect(response.timestamp).toBeTruthy()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should make POST request with data', async () => {
      mockFetch = createMockFetch([
        {
          method: 'POST',
          url: '/test',
          response: { success: true, data: { id: 1 }, timestamp: new Date().toISOString() }
        }
      ])
      global.fetch = mockFetch

      const response = await client.request('/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' })
      })

      expect(response.success).toBe(true)
      expect(response.data).toEqual({ id: 1 })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' })
        })
      )
    })

    it('should handle API error responses', async () => {
      await expect(client.request('/error')).rejects.toThrow(APIError)
    })

    it('should handle rate limiting', async () => {
      const onRateLimit = vi.fn()
      client = new APIClient({
        onRateLimit
      })

      await expect(client.request('/rate-limit')).rejects.toThrow(APIError)
      expect(onRateLimit).toHaveBeenCalledWith(60)
    })

    it('should handle unauthorized responses', async () => {
      const onAuthError = vi.fn()
      client = new APIClient({
        onAuthError
      })

      await expect(client.request('/unauthorized')).rejects.toThrow(APIError)
      expect(onAuthError).toHaveBeenCalled()
    })

    it('should retry failed requests', async () => {
      let attemptCount = 0
      mockFetch = vi.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network error')
        }
        return mockResponse({ data: 'success after retries' })
      })
      global.fetch = mockFetch

      const response = await client.request('/test')
      expect(response.data).toBe('success after retries')
      expect(attemptCount).toBe(3)
    })

    it('should not retry client errors', async () => {
      mockFetch = vi.fn().mockRejectedValue(new APIError('Client error', 400))
      global.fetch = mockFetch

      await expect(client.request('/test')).rejects.toThrow(APIError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors', async () => {
      mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      await expect(client.request('/test')).rejects.toThrow(NetworkError)
    })

    it('should handle timeouts', async () => {
      client = new APIClient({ timeout: 100 })
      mockFetch = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return mockResponse({ data: 'late response' })
      })
      global.fetch = mockFetch

      await expect(client.request('/test')).rejects.toThrow(TimeoutError)
    })

    it('should cancel requests', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      client.cancelRequest()
      expect(abortSpy).toHaveBeenCalled()
      abortSpy.mockRestore()
    })
  })

  describe('convenience methods', () => {
    beforeEach(() => {
      mockFetch = createMockFetch([
        {
          url: '/projects',
          response: {
            success: true,
            data: {
              projects: [mockProject],
              pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_next: false, has_prev: false }
            },
            timestamp: new Date().toISOString()
          }
        },
        {
          url: '/projects/123',
          response: { success: true, data: mockProject, timestamp: new Date().toISOString() }
        },
        {
          method: 'POST',
          url: '/projects',
          response: { success: true, data: mockProject, timestamp: new Date().toISOString() }
        }
      ])
      global.fetch = mockFetch
    })

    it('should get projects', async () => {
      const projects = await client.getProjects()
      expect(projects.projects).toHaveLength(1)
      expect(projects.pagination.total).toBe(1)
    })

    it('should get single project', async () => {
      const project = await client.getProject('123')
      expect(project).toBeDefined()
      expect(project.id).toBe(mockProject.id)
    })

    it('should create project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test project'
      }
      const project = await client.createProject(projectData)
      expect(project).toBeDefined()
      expect(project.name).toBe(projectData.name)
    })
  })

  describe('response parsing', () => {
    it('should parse JSON responses', async () => {
      mockFetch = createMockFetch([
        {
          url: '/json',
          response: { success: true, data: { json: true }, timestamp: new Date().toISOString() },
          headers: { 'content-type': 'application/json' }
        }
      ])
      global.fetch = mockFetch

      const response = await client.request('/json')
      expect(response.data).toEqual({ json: true })
    })

    it('should parse text responses', async () => {
      mockFetch = createMockFetch([
        {
          url: '/text',
          response: 'plain text response',
          headers: { 'content-type': 'text/plain' }
        }
      ])
      global.fetch = mockFetch

      const response = await client.request('/text')
      expect(response.data).toBe('plain text response')
    })

    it('should handle unsupported content types', async () => {
      mockFetch = createMockFetch([
        {
          url: '/binary',
          response: new Blob(['binary data']),
          headers: { 'content-type': 'application/octet-stream' }
        }
      ])
      global.fetch = mockFetch

      const response = await client.request('/binary')
      expect(response.data).toBeInstanceOf(Blob)
    })
  })

  describe('hooks', () => {
    it('should call request hook', async () => {
      const onRequest = vi.fn()
      client = new APIClient({ onRequest })

      await client.request('/test')
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          timeout: 5000,
          retries: 2,
          retryDelay: 100
        })
      )
    })

    it('should call response hook', async () => {
      const onResponse = vi.fn()
      client = new APIClient({ onResponse })

      await client.request('/test')
      expect(onResponse).toHaveBeenCalledWith(expect.any(Response))
    })

    it('should call error hook', async () => {
      const onError = vi.fn()
      client = new APIClient({ onError })

      try {
        await client.request('/error')
      } catch (error) {
        // Expected to throw
      }

      expect(onError).toHaveBeenCalledWith(expect.any(APIError))
    })
  })

  describe('streaming', () => {
    it('should handle streaming responses', async () => {
      const streamData = [
        { data: 'chunk1' },
        { data: 'chunk2' },
        { data: 'chunk3' }
      ]

      const stream = new ReadableStream({
        start(controller) {
          streamData.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`))
          })
          controller.close()
        }
      })

      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
        headers: new Headers({ 'content-type': 'text/event-stream' })
      })
      global.fetch = mockFetch

      const chunks = []
      for await (const chunk of client.streamChat({ message: 'test' })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(3)
      expect(chunks[0]).toEqual(streamData[0])
    })

    it('should handle streaming errors', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'))
        }
      })

      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
        headers: new Headers({ 'content-type': 'text/event-stream' })
      })
      global.fetch = mockFetch

      const generator = client.streamChat({ message: 'test' })
      await expect(generator.next()).rejects.toThrow()
    })
  })
})

// Import mock data for tests
const mockProject = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Project',
  description: 'A test project',
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}