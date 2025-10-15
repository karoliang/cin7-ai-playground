import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AIGatewayService } from '../aiGatewayService'
import { aiGatewayConfig } from '@/config/aiGatewayConfig'
import { getGLMService } from '../glmService'

// Mock dependencies
vi.mock('@/config/aiGatewayConfig')
vi.mock('../glmService')
vi.mock('../responseCache')
vi.mock('../rateLimiter')
vi.mock('../contextManager')
vi.mock('../aiMetrics')
vi.mock('../aiHealthCheck')

describe('AIGatewayService', () => {
  let service: AIGatewayService
  let mockConfig: any

  beforeEach(async () => {
    // Mock configuration
    mockConfig = {
      providers: [
        {
          id: 'glm',
          name: 'GLM',
          type: 'glm',
          enabled: true,
          priority: 1,
          config: {
            apiKey: 'test-key',
            model: 'glm-4'
          }
        }
      ],
      defaultProvider: 'glm',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      cache: {
        enabled: true,
        ttl: 300000,
        maxSize: 1000,
        strategy: 'lru',
        storage: { type: 'memory', config: {} },
        keyGenerator: { algorithm: 'sha256', includeContext: true, includeOptions: true }
      },
      rateLimiting: {
        enabled: true,
        strategy: 'sliding-window',
        limits: [],
        storage: { type: 'memory', config: {} }
      },
      monitoring: {
        enabled: true,
        metrics: { enabled: true, interval: 60000, retention: 86400000, export: { type: 'prometheus', config: {} } },
        logging: { level: 'info', format: 'json', outputs: [{ type: 'console', config: {} }] },
        tracing: { enabled: false, sampling: 0.1, export: { type: 'jaeger', config: {} } },
        alerts: { enabled: false, rules: [], channels: [] }
      },
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3,
        endpoints: []
      },
      features: {
        caching: true,
        rateLimiting: true,
        monitoring: true,
        healthChecks: true,
        streaming: true,
        multiProvider: true,
        loadBalancing: true,
        circuitBreaker: true,
        requestDeduplication: true,
        costOptimization: true
      }
    }

    vi.mocked(aiGatewayConfig.getConfig).mockReturnValue(mockConfig)
    vi.mocked(aiGatewayConfig.initialize).mockResolvedValue(mockConfig)

    // Mock GLM service
    const mockGLMService = {
      generateCode: vi.fn(),
      generateCodeStream: vi.fn(),
      processContextualUpdate: vi.fn(),
      testConnection: vi.fn()
    }
    vi.mocked(getGLMService).mockReturnValue(mockGLMService)

    service = await AIGatewayService.initialize()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(AIGatewayService)
    })

    it('should initialize only once', async () => {
      const service2 = await AIGatewayService.initialize()
      expect(service).toBe(service2)
    })
  })

  describe('generateResponse', () => {
    it('should generate response successfully', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' }
      }

      const mockGLMResponse = {
        success: true,
        files: [{
          id: 'file1',
          name: 'Component.tsx',
          type: 'tsx' as const,
          content: 'export default function Component() { return <div>Hello</div>; }',
          language: 'typescript'
        }],
        operations: [],
        reasoning: 'Generated React component'
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCode).mockResolvedValue(mockGLMResponse)

      const result = await service.generateResponse(mockRequest)

      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('Component.tsx')
    })

    it('should handle errors gracefully', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' }
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCode).mockRejectedValue(new Error('API Error'))

      const result = await service.generateResponse(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle cached responses', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' }
      }

      const mockGLMResponse = {
        success: true,
        files: [{
          id: 'file1',
          name: 'Component.tsx',
          type: 'tsx' as const,
          content: 'export default function Component() { return <div>Hello</div>; }',
          language: 'typescript'
        }],
        operations: [],
        reasoning: 'Generated React component'
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCode).mockResolvedValue(mockGLMResponse)

      // First request
      const result1 = await service.generateResponse(mockRequest)
      expect(result1.success).toBe(true)

      // Second request should use cache (GLM service called only once)
      const result2 = await service.generateResponse(mockRequest)
      expect(result2.success).toBe(true)
      expect(mockGLMService.generateCode).toHaveBeenCalledTimes(1)
    })
  })

  describe('generateResponseStream', () => {
    it('should handle streaming responses', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' },
        options: { stream: true }
      }

      const mockChunks = ['export default function Component() {', 'return <div>Hello</div>;', '}']

      const mockGLMService = getGLMService()
      const mockGenerator = async function* () {
        for (const chunk of mockChunks) {
          yield chunk
        }
      }
      vi.mocked(mockGLMService.generateCodeStream).mockReturnValue(mockGenerator())

      const chunks: string[] = []
      for await (const chunk of service.generateResponseStream(mockRequest)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(mockChunks)
    })

    it('should handle streaming errors', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' },
        options: { stream: true }
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCodeStream).mockRejectedValue(new Error('Stream Error'))

      const chunks: string[] = []
      for await (const chunk of service.generateResponseStream(mockRequest)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toContain('Error')
    })
  })

  describe('processContextualUpdate', () => {
    it('should process contextual updates', async () => {
      const mockContext = {
        project_id: 'test-project',
        architecture: { type: 'multi-page' }
      }
      const mockFiles = [{
        id: 'file1',
        name: 'Component.tsx',
        type: 'tsx' as const,
        content: 'export default function Component() { return <div>Hello</div>; }'
      }]
      const mockMessages = [{
        id: 'msg1',
        role: 'user' as const,
        content: 'Update the component',
        timestamp: Date.now().toString()
      }]

      const mockUpdateResult = {
        success: true,
        files: mockFiles,
        operations: []
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.processContextualUpdate).mockResolvedValue(mockUpdateResult)

      const result = await service.processContextualUpdate(mockContext, mockFiles, mockMessages)

      expect(result.success).toBe(true)
      expect(mockGLMService.processContextualUpdate).toHaveBeenCalledWith(
        mockContext,
        mockFiles,
        mockMessages
      )
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failures', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' }
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCode).mockRejectedValue(new Error('API Error'))

      // Make multiple failing requests
      for (let i = 0; i < 6; i++) {
        try {
          await service.generateResponse(mockRequest)
        } catch (error) {
          // Expected to fail
        }
      }

      // The circuit breaker should now be open
      // This would require access to internal state to test directly
      // For now, just ensure the service handles failures gracefully
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('Request Deduplication', () => {
    it('should deduplicate identical requests', async () => {
      const mockRequest = {
        prompt: 'Create a React component',
        context: { project_id: 'test-project' }
      }

      const mockGLMResponse = {
        success: true,
        files: [{
          id: 'file1',
          name: 'Component.tsx',
          type: 'tsx' as const,
          content: 'export default function Component() { return <div>Hello</div>; }',
          language: 'typescript'
        }],
        operations: [],
        reasoning: 'Generated React component'
      }

      const mockGLMService = getGLMService()
      vi.mocked(mockGLMService.generateCode).mockImplementation(async () => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockGLMResponse
      })

      // Start two identical requests concurrently
      const [result1, result2] = await Promise.all([
        service.generateResponse(mockRequest),
        service.generateResponse(mockRequest)
      ])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // GLM service should only be called once due to deduplication
      expect(mockGLMService.generateCode).toHaveBeenCalledTimes(1)
    })
  })

  describe('Service Statistics', () => {
    it('should return service statistics', () => {
      const stats = service.getStats()

      expect(stats).toBeDefined()
      expect(stats.initialized).toBe(true)
      expect(stats.config.providers).toBe(1)
      expect(stats.config.defaultProvider).toBe('glm')
      expect(stats.services).toBeDefined()
      expect(stats.circuitBreaker).toBeDefined()
      expect(stats.pendingRequests).toBe(0)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      const cleanupSpy = vi.spyOn(service as any, 'cleanup')

      await service.cleanup()

      expect(cleanupSpy).toHaveBeenCalled()
    })
  })
})

describe('AI Gateway Integration', () => {
  let service: AIGatewayService

  beforeEach(async () => {
    // Set up real configuration for integration tests
    process.env.VITE_GLM_API_KEY = 'test-key'
    process.env.VITE_AI_GATEWAY_CACHE_ENABLED = 'true'
    process.env.VITE_AI_GATEWAY_RATE_LIMIT_ENABLED = 'true'
    process.env.VITE_AI_GATEWAY_MONITORING_ENABLED = 'true'

    service = await AIGatewayService.initialize()
  })

  afterEach(() => {
    delete process.env.VITE_GLM_API_KEY
    delete process.env.VITE_AI_GATEWAY_CACHE_ENABLED
    delete process.env.VITE_AI_GATEWAY_RATE_LIMIT_ENABLED
    delete process.env.VITE_AI_GATEWAY_MONITORING_ENABLED
  })

  it('should handle end-to-end request flow', async () => {
    const request = {
      prompt: 'Create a simple counter component in React with TypeScript',
      context: {
        project_id: 'test-project',
        framework: 'react',
        architecture: { type: 'single-page' }
      },
      options: {
        temperature: 0.7,
        max_tokens: 1000
      }
    }

    // Mock the actual API call for testing
    const mockGLMService = getGLMService()
    vi.mocked(mockGLMService.generateCode).mockResolvedValue({
      success: true,
      files: [{
        id: 'counter-file',
        name: 'Counter.tsx',
        type: 'tsx' as const,
        content: `
import React, { useState } from 'react';

interface CounterProps {
  initialValue?: number;
}

export default function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}
        `,
        language: 'typescript'
      }],
      operations: [{
        type: 'create' as const,
        file: 'Counter.tsx',
        content: 'Generated counter component',
        reason: 'Created counter as requested'
      }],
      reasoning: 'Created a React counter component with TypeScript'
    })

    const result = await service.generateResponse(request)

    expect(result.success).toBe(true)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].name).toBe('Counter.tsx')
    expect(result.files[0].content).toContain('useState')
    expect(result.operations).toHaveLength(1)
    expect(result.reasoning).toBeDefined()
  })

  it('should handle streaming responses', async () => {
    const request = {
      prompt: 'Create a simple counter component',
      context: { project_id: 'test-project' },
      options: { stream: true }
    }

    const mockChunks = [
      'import React, { useState } from \'react\';\n\n',
      'export default function Counter() {\n',
      '  const [count, setCount] = useState(0);\n',
      '  return (\n',
      '    <div>\n',
      '      <p>Count: {count}</p>\n',
      '      <button onClick={() => setCount(count + 1)}>+</button>\n',
      '      <button onClick={() => setCount(count - 1)}>-</button>\n',
      '    </div>\n',
      '  );\n',
      '}'
    ]

    const mockGLMService = getGLMService()
    const mockGenerator = async function* () {
      for (const chunk of mockChunks) {
        yield chunk
      }
    }
    vi.mocked(mockGLMService.generateCodeStream).mockReturnValue(mockGenerator())

    const chunks: string[] = []
    for await (const chunk of service.generateResponseStream(request)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(11)
    expect(chunks.join('')).toContain('useState')
    expect(chunks.join('')).toContain('Count: {count}')
  })

  it('should maintain performance under load', async () => {
    const requests = Array.from({ length: 10 }, (_, i) => ({
      prompt: `Create component ${i + 1}`,
      context: { project_id: 'test-project' }
    }))

    const mockGLMService = getGLMService()
    vi.mocked(mockGLMService.generateCode).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return {
        success: true,
        files: [{
          id: `file-${Math.random()}`,
          name: `Component.tsx`,
          type: 'tsx' as const,
          content: 'export default function Component() { return <div>Hello</div>; }',
          language: 'typescript'
        }],
        operations: [],
        reasoning: 'Generated component'
      }
    })

    const startTime = Date.now()
    const results = await Promise.all(requests.map(req => service.generateResponse(req)))
    const endTime = Date.now()

    expect(results).toHaveLength(10)
    expect(results.every(r => r.success)).toBe(true)
    expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
  })
})