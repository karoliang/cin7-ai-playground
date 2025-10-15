// Test utilities and helpers

import { vi } from 'vitest'

// Mock user data
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  email_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock project data
export const mockProject = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Project',
  description: 'A test project for API testing',
  prompt: 'Create a simple React application',
  files: [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'index.html',
      type: 'html' as const,
      content: '<html><body><h1>Hello World</h1></body></html>',
      language: 'html',
      path: '/index.html',
      size: 50,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  messages: [],
  metadata: {
    framework: 'react' as const,
    template: 'blank' as const,
    architecture: {
      type: 'single-page' as const
    },
    tags: ['test', 'demo'],
    version: '1.0.0'
  },
  settings: {
    theme: {
      mode: 'light' as const,
      primary_color: '#000000'
    },
    editor: {
      tab_size: 2,
      word_wrap: true,
      minimap: false,
      line_numbers: true,
      font_size: 14,
      theme: 'vs-dark'
    },
    preview: {
      auto_refresh: true,
      device: 'desktop' as const,
      orientation: 'landscape' as const,
      size: {
        width: 1920,
        height: 1080
      }
    },
    ai: {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
      context_window: 4000,
      auto_suggestions: true,
      code_completion: true
    },
    collaboration: {
      real_time: false,
      permissions: []
    }
  },
  status: 'active' as const,
  user_id: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock AI models
export const mockAIModels = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    capabilities: ['code-generation', 'chat', 'analysis'],
    max_tokens: 8192,
    cost_per_token: 0.00003,
    available: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    capabilities: ['chat', 'code-generation'],
    max_tokens: 4096,
    cost_per_token: 0.000001,
    available: true
  }
]

// Mock authentication context
export const mockAuthContext = {
  user: mockUser,
  token: 'mock_jwt_token'
}

// Mock request object
export const mockRequest = (options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
} = {}) => {
  const {
    method = 'GET',
    url = 'https://api.example.com/test',
    headers = {},
    body
  } = options

  const request = {
    method,
    url,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    clone: () => mockRequest(options)
  } as any

  if (body) {
    request.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  return request
}

// Mock response object
export const mockResponse = (options: {
  status?: number
  data?: any
  headers?: Record<string, string>
} = {}) => {
  const {
    status = 200,
    data = {},
    headers = {}
  } = options

  const response = {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    clone: () => mockResponse(options)
  } as any

  return response
}

// Create mock fetch responses
export function createMockFetch(responses: Array<{
  url?: string | RegExp
  method?: string
  response: any
  status?: number
  delay?: number
}>) {
  return vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET'

    // Find matching response
    const matchedResponse = responses.find(({ url: matchUrl, method: matchMethod }) => {
      const methodMatch = !matchMethod || matchMethod === method

      if (!matchUrl) return methodMatch

      if (matchUrl instanceof RegExp) {
        return methodMatch && matchUrl.test(url)
      }

      return methodMatch && url.includes(matchUrl)
    })

    if (!matchedResponse) {
      throw new Error(`No mock response found for ${method} ${url}`)
    }

    // Add delay if specified
    if (matchedResponse.delay) {
      await new Promise(resolve => setTimeout(resolve, matchedResponse.delay))
    }

    return mockResponse({
      status: matchedResponse.status || 200,
      data: matchedResponse.response
    })
  })
}

// Wait for async operations
export const waitFor = (ms: number = 0): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// Create test data generators
export const createTestProject = (overrides: Partial<typeof mockProject> = {}) => ({
  ...mockProject,
  id: `test-project-${Date.now()}`,
  ...overrides
})

export const createTestUser = (overrides: Partial<typeof mockUser> = {}) => ({
  ...mockUser,
  id: `test-user-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  ...overrides
})

// Validation helpers
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const validateISODate = (date: string): boolean => {
  const d = new Date(date)
  return !isNaN(d.getTime()) && date.includes('T')
}

export const validateApiResponse = (response: any): boolean => {
  return (
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'string' &&
    validateISODate(response.timestamp)
  )
}

// Error helpers
export const createMockError = (message: string, status: number = 500) => {
  const error = new Error(message) as any
  error.status = status
  return error
}

// Database helpers (for integration tests)
export const cleanupDatabase = async (): Promise<void> => {
  // This would typically clean up test data
  // Implementation depends on your database setup
  console.log('Cleaning up test database...')
}

export const seedDatabase = async (): Promise<void> => {
  // This would typically seed test data
  // Implementation depends on your database setup
  console.log('Seeding test database...')
}

// File system helpers
export const createMockFile = (name: string, content: string, type: string = 'text/plain'): File => {
  return new File([content], name, { type })
}

// Performance testing helpers
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, duration: end - start }
}

// Random data generators
export const randomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, 2 + length)
}

export const randomEmail = (): string => {
  return `${randomString()}@example.com`
}

export const randomUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Assertion helpers
export const expectValidProject = (project: any) => {
  expect(project).toHaveProperty('id')
  expect(project.id).toBeValidUUID()
  expect(project).toHaveProperty('name')
  expect(project).toHaveProperty('user_id')
  expect(project.user_id).toBeValidUUID()
  expect(project).toHaveProperty('created_at')
  expect(project.created_at).toBeValidISODate()
  expect(project).toHaveProperty('updated_at')
  expect(project.updated_at).toBeValidISODate()
  expect(project).toHaveProperty('status')
  expect(['draft', 'active', 'archived', 'deleted', 'building', 'deployed', 'error']).toContain(project.status)
}

export const expectValidUser = (user: any) => {
  expect(user).toHaveProperty('id')
  expect(user.id).toBeValidUUID()
  expect(user).toHaveProperty('email')
  expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  expect(user).toHaveProperty('created_at')
  expect(user.created_at).toBeValidISODate()
  expect(user).toHaveProperty('updated_at')
  expect(user.updated_at).toBeValidISODate()
}

export const expectValidAPIResponse = (response: any) => {
  expect(response).toHaveProperty('success')
  expect(typeof response.success).toBe('boolean')
  expect(response).toHaveProperty('timestamp')
  expect(response.timestamp).toBeValidISODate()

  if (response.success && response.data) {
    expect(response).toHaveProperty('data')
  } else if (!response.success) {
    expect(response).toHaveProperty('error')
    expect(response.error).toBeTruthy()
  }
}

// Test context helpers
export const createTestContext = (overrides: any = {}) => ({
  user: mockUser,
  request: mockRequest(),
  ...overrides
})

// Mock storage helpers
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  }
}

// Mock session storage
export const mockSessionStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  }
}