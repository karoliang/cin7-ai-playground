import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GLMService,
  getGLMService,
  initializeGLMService,
  isGLMServiceInitialized,
  validateGLMConfig,
  createGLMConfigFromEnv,
  DEFAULT_GLM_CONFIG,
  GLMProviderConfig
} from '../glmService'
import type { GLMConfig, GenerateRequest } from '@/types'

// Mock the zhipu-sdk-js
vi.mock('zhipu-sdk-js', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}))

// Mock environment variables
const mockEnv = {
  VITE_GLM_API_KEY: 'test-api-key-12345',
  VITE_GLM_BASE_URL: 'https://api.test.com',
  VITE_GLM_TIMEOUT: '30000',
  VITE_GLM_RETRY_ATTEMPTS: '3',
  VITE_GLM_RETRY_DELAY: '1000',
  VITE_GLM_ENABLE_LOGGING: 'true',
  VITE_SUPABASE_ANON_KEY: 'test-supabase-key'
}

describe('GLM Service', () => {
  let glmService: GLMService
  let mockConfig: GLMConfig

  beforeEach(() => {
    // Setup mock environment
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })

    mockConfig = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.test.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    }

    // Reset singleton instance
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('GLMService Class', () => {
    it('should initialize with valid configuration', () => {
      expect(() => {
        glmService = new GLMService(mockConfig)
      }).not.toThrow()
    })

    it('should throw error without API key', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' }
      expect(() => {
        new GLMService(invalidConfig)
      }).toThrow('GLM API key is required')
    })

    it('should merge default configuration with provided config', () => {
      const partialConfig = { apiKey: 'test-key' }
      glmService = new GLMService(partialConfig)

      expect(glmService['config'].baseURL).toBe(DEFAULT_GLM_CONFIG.baseURL)
      expect(glmService['config'].timeout).toBe(DEFAULT_GLM_CONFIG.timeout)
    })

    it('should have healthy status on initialization', () => {
      glmService = new GLMService(mockConfig)
      const health = glmService.getHealthStatus()
      expect(health.status).toBe('healthy')
      expect(health.last_check).toBeDefined()
    })
  })

  describe('Code Generation', () => {
    beforeEach(() => {
      glmService = new GLMService(mockConfig)
    })

    it('should generate code successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [{
                name: 'test.tsx',
                content: 'export default function Test() { return <div>Test</div>; }',
                type: 'tsx'
              }],
              explanation: 'Generated test component',
              operations: [{
                type: 'create',
                file: 'test.tsx',
                content: 'export default function Test() { return <div>Test</div>; }',
                reason: 'Create test component'
              }]
            })
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      const request: GenerateRequest = {
        prompt: 'Create a simple React component',
        context: {
          framework: 'react',
          template: 'blank'
        }
      }

      const result = await glmService.generateCode(request)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('test.tsx')
      expect(result.operations).toHaveLength(1)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'glm-4',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'))
      glmService['client'].chat.completions.create = mockCreate

      const request: GenerateRequest = {
        prompt: 'Create a simple React component'
      }

      const result = await glmService.generateCode(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
      expect(result.files).toHaveLength(0)
    })

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      const request: GenerateRequest = {
        prompt: 'Create a simple React component'
      }

      const result = await glmService.generateCode(request)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].content).toBe('Invalid JSON response')
      expect(result.reasoning).toBe('Code generated with fallback parsing')
    })

    it('should record metrics for successful requests', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              files: [],
              explanation: 'Test response'
            })
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      const request: GenerateRequest = {
        prompt: 'Test prompt'
      }

      await glmService.generateCode(request)

      const metrics = glmService.getRequestMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].success).toBe(true)
      expect(metrics[0].total_tokens).toBe(300)
    })
  })

  describe('Contextual Updates', () => {
    beforeEach(() => {
      glmService = new GLMService(mockConfig)
    })

    it('should process contextual updates successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              success: true,
              files: [{
                name: 'updated.tsx',
                content: 'updated content',
                type: 'tsx'
              }],
              operations: [{
                type: 'update',
                file: 'updated.tsx',
                content: 'updated content',
                reason: 'Update based on context'
              }],
              explanation: 'Files updated based on context'
            })
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 250,
          total_tokens: 400
        }
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      const context = { project_type: 'react' }
      const files = [{
        id: '1',
        name: 'test.tsx',
        type: 'tsx',
        content: 'old content'
      }]
      const messages = [{
        id: '1',
        role: 'user',
        content: 'Update the component',
        timestamp: new Date().toISOString()
      }]

      const result = await glmService.processContextualUpdate(context, files, messages)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(1)
      expect(result.explanation).toBe('Files updated based on context')
    })
  })

  describe('Connection Testing', () => {
    beforeEach(() => {
      glmService = new GLMService(mockConfig)
    })

    it('should test connection successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Connection successful'
          }
        }]
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      const result = await glmService.testConnection()

      expect(result).toBe(true)
      const health = glmService.getHealthStatus()
      expect(health.status).toBe('healthy')
    })

    it('should handle connection test failure', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Connection failed'))
      glmService['client'].chat.completions.create = mockCreate

      const result = await glmService.testConnection()

      expect(result).toBe(false)
      const health = glmService.getHealthStatus()
      expect(health.status).toBe('unhealthy')
      expect(health.error_message).toBe('Connection failed')
    })
  })

  describe('Metrics Management', () => {
    beforeEach(() => {
      glmService = new GLMService(mockConfig)
    })

    it('should clear metrics', () => {
      // Add some mock metrics
      glmService['requestMetrics'] = [
        {
          request_id: 'test-1',
          timestamp: Date.now(),
          model: 'glm-4',
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
          latency_ms: 1000,
          success: true
        }
      ]

      expect(glmService.getRequestMetrics()).toHaveLength(1)

      glmService.clearMetrics()

      expect(glmService.getRequestMetrics()).toHaveLength(0)
    })

    it('should limit metrics to last 1000 entries', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({ files: [] })
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }

      const mockCreate = vi.fn().mockResolvedValue(mockResponse)
      glmService['client'].chat.completions.create = mockCreate

      // Simulate many requests
      for (let i = 0; i < 1005; i++) {
        await glmService.generateCode({ prompt: `Test ${i}` })
      }

      const metrics = glmService.getRequestMetrics()
      expect(metrics.length).toBeLessThanOrEqual(1000)
    })
  })
})

describe('GLM Service Utilities', () => {
  beforeEach(() => {
    // Setup mock environment
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('validateGLMConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        apiKey: 'valid-api-key-12345',
        timeout: 30000
      }

      const errors = validateGLMConfig(config)
      expect(errors).toHaveLength(0)
    })

    it('should detect missing API key', () => {
      const config = {
        timeout: 30000
      }

      const errors = validateGLMConfig(config)
      expect(errors).toContain('API key is required')
    })

    it('should detect invalid API key', () => {
      const config = {
        apiKey: 'short',
        timeout: 30000
      }

      const errors = validateGLMConfig(config)
      expect(errors).toContain('API key appears to be invalid')
    })

    it('should detect invalid timeout', () => {
      const config = {
        apiKey: 'valid-api-key-12345',
        timeout: 500
      }

      const errors = validateGLMConfig(config)
      expect(errors).toContain('Timeout should be at least 1000ms')
    })

    it('should detect too many retry attempts', () => {
      const config = {
        apiKey: 'valid-api-key-12345',
        retryAttempts: 15
      }

      const errors = validateGLMConfig(config)
      expect(errors).toContain('Retry attempts should not exceed 10')
    })
  })

  describe('createGLMConfigFromEnv', () => {
    it('should create configuration from environment variables', () => {
      const config = createGLMConfigFromEnv()

      expect(config.apiKey).toBe(mockEnv.VITE_GLM_API_KEY)
      expect(config.baseURL).toBe(mockEnv.VITE_GLM_BASE_URL)
      expect(config.timeout).toBe(30000)
      expect(config.retryAttempts).toBe(3)
      expect(config.retryDelay).toBe(1000)
    })

    it('should throw error when API key is missing', () => {
      vi.stubEnv('VITE_GLM_API_KEY', '')

      expect(() => {
        createGLMConfigFromEnv()
      }).toThrow('VITE_GLM_API_KEY environment variable is required')
    })
  })

  describe('Singleton Pattern', () => {
    it('should initialize singleton with config', () => {
      const config = { apiKey: 'test-key' }
      const service = initializeGLMService(config)

      expect(service).toBeInstanceOf(GLMService)
      expect(isGLMServiceInitialized()).toBe(true)
    })

    it('should return existing instance', () => {
      const config = { apiKey: 'test-key' }
      const service1 = initializeGLMService(config)
      const service2 = getGLMService()

      expect(service1).toBe(service2)
    })

    it('should throw error when getting uninitialized service', () => {
      expect(() => {
        getGLMService()
      }).toThrow('GLM Service not initialized')
    })

    it('should check initialization status', () => {
      expect(isGLMServiceInitialized()).toBe(false)

      initializeGLMService({ apiKey: 'test-key' })

      expect(isGLMServiceInitialized()).toBe(true)
    })
  })

  describe('GLM Provider Configuration', () => {
    it('should have correct provider configuration', () => {
      expect(GLMProviderConfig.name).toBe('glm')
      expect(GLMProviderConfig.displayName).toBe('GLM (ZhipuAI)')
      expect(GLMProviderConfig.models).toContain('glm-4')
      expect(GLMProviderConfig.defaultModel).toBe('glm-4')
      expect(GLMProviderConfig.maxTokens).toBe(128000)
      expect(GLMProviderConfig.supportedFeatures).toContain('chat_completion')
      expect(GLMProviderConfig.supportedFeatures).toContain('code_generation')
    })
  })
})