# AI Gateway Service Documentation

## Overview

The AI Gateway Service is a comprehensive, enterprise-grade middleware layer that manages all AI interactions within the CIN7 AI Playground. It provides centralized management, intelligent caching, rate limiting, monitoring, and fault tolerance for AI operations.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Gateway Service                        │
├─────────────────────────────────────────────────────────────┤
│  Request Processing                                          │
│  ├── Request Validation & Sanitization                      │
│  ├── Request Deduplication                                  │
│  ├── Context Enhancement                                     │
│  └── Provider Selection & Load Balancing                     │
├─────────────────────────────────────────────────────────────┤
│  Core Services                                               │
│  ├── Configuration Management                               │
│  ├── Response Cache (LRU/LFU/TTL/Adaptive)                  │
│  ├── Rate Limiting (Sliding/Fixed/Token Bucket)             │
│  ├── Context Manager                                         │
│  ├── Metrics & Monitoring                                   │
│  ├── Health Check System                                     │
│  ├── Streaming Service                                       │
│  └── Error Handling & Recovery                              │
├─────────────────────────────────────────────────────────────┤
│  Provider Abstraction                                        │
│  ├── GLM Provider                                           │
│  ├── OpenAI Provider (Future)                               │
│  ├── Anthropic Provider (Future)                            │
│  └── Custom Provider Support                                 │
├─────────────────────────────────────────────────────────────┤
│  Cross-Cutting Concerns                                      │
│  ├── Circuit Breaker                                         │
│  ├── Retry Logic                                            │
│  ├── Content Filtering                                       │
│  └── Cost Optimization                                       │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🔧 Configuration Management
- Environment-based configuration
- Dynamic configuration updates
- Provider-specific settings
- Feature flags
- Configuration validation

### 🚀 Request Processing
- Request validation and sanitization
- Request deduplication
- Context enhancement
- Provider load balancing
- Streaming support

### 💾 Intelligent Caching
- Multiple cache strategies (LRU, LFU, TTL, Adaptive)
- Configurable cache storage (Memory, Redis, LocalStorage)
- Intelligent cache key generation
- Cache invalidation strategies
- Cache hit rate optimization

### 🚦 Rate Limiting
- Multiple rate limiting strategies (Sliding Window, Fixed Window, Token Bucket)
- Configurable limits per user, project, session, or IP
- Adaptive rate limiting based on system load
- Graceful degradation
- Rate limit bypass for premium users

### 📊 Monitoring & Metrics
- Comprehensive request/response metrics
- Performance monitoring (latency, throughput, error rates)
- Cost tracking and optimization
- Real-time dashboards
- Export metrics (Prometheus, JSON, CSV)
- Alerting system

### 🔍 Health Monitoring
- Multi-endpoint health checks
- Provider health monitoring
- Circuit breaker pattern
- Automatic failover
- Health status API

### 🌊 Streaming Support
- Real-time response streaming
- Chunk buffering and optimization
- Stream cancellation
- Content filtering for streams
- Stream recovery mechanisms

### 🛡️ Error Handling & Recovery
- Comprehensive error classification
- Automatic retry with exponential backoff
- Graceful degradation
- User-friendly error messages
- Error analytics and reporting

## Quick Start

### 1. Installation

The AI Gateway is already integrated into the CIN7 AI Playground. Ensure you have the required environment variables:

```bash
# Required
VITE_GLM_API_KEY=your_glm_api_key

# Optional - AI Gateway Configuration
VITE_AI_GATEWAY_DEFAULT_PROVIDER=glm
VITE_AI_GATEWAY_CACHE_ENABLED=true
VITE_AI_GATEWAY_RATE_LIMIT_ENABLED=true
VITE_AI_GATEWAY_MONITORING_ENABLED=true
```

### 2. Basic Usage

```typescript
import { getAIGatewayService, initializeAIGateway } from '@/services/aiGatewayService'
import { GenerateRequest } from '@/types'

// Initialize the service
await initializeAIGateway()

// Get service instance
const gatewayService = await getAIGatewayService()

// Generate code
const request: GenerateRequest = {
  prompt: 'Create a React counter component',
  context: {
    projectId: 'my-project',
    framework: 'react'
  }
}

const response = await gatewayService.generateResponse(request)
console.log('Generated files:', response.files)
```

### 3. Streaming Responses

```typescript
import { getAIGatewayService } from '@/services/aiGatewayService'

const gatewayService = await getAIGatewayService()
const request = {
  prompt: 'Create a React counter component',
  context: { projectId: 'my-project' },
  options: { stream: true }
}

for await (const chunk of gatewayService.generateResponseStream(request)) {
  console.log('Received chunk:', chunk)
}
```

### 4. React Hook Integration

```typescript
import { useAIGateway } from '@/examples/aiGatewayIntegration'

function MyComponent() {
  const { generateCode, isGenerating, error } = useAIGateway()

  const handleGenerate = async () => {
    try {
      const response = await generateCode({
        prompt: 'Create a counter component',
        context: { projectId: 'my-project' }
      })
      // Handle response
    } catch (err) {
      // Handle error
    }
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Code'}
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  )
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AI_GATEWAY_DEFAULT_PROVIDER` | Default AI provider | `glm` |
| `VITE_AI_GATEWAY_TIMEOUT` | Request timeout in ms | `30000` |
| `VITE_AI_GATEWAY_RETRY_ATTEMPTS` | Maximum retry attempts | `3` |
| `VITE_AI_GATEWAY_RETRY_DELAY` | Base retry delay in ms | `1000` |

### Cache Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AI_GATEWAY_CACHE_ENABLED` | Enable caching | `true` |
| `VITE_AI_GATEWAY_CACHE_TTL` | Cache TTL in ms | `300000` |
| `VITE_AI_GATEWAY_CACHE_MAX_SIZE` | Maximum cache size | `1000` |
| `VITE_AI_GATEWAY_CACHE_STRATEGY` | Cache strategy | `lru` |

### Rate Limiting Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AI_GATEWAY_RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |
| `VITE_AI_GATEWAY_RATE_LIMIT` | Requests per minute | `100` |
| `VITE_AI_GATEWAY_RATE_LIMIT_WINDOW` | Rate limit window in ms | `60000` |

### Monitoring Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AI_GATEWAY_MONITORING_ENABLED` | Enable monitoring | `true` |
| `VITE_AI_GATEWAY_LOG_LEVEL` | Log level | `info` |
| `VITE_AI_GATEWAY_METRICS_ENABLED` | Enable metrics | `true` |

## API Reference

### AIGatewayService

Main service class for AI Gateway operations.

#### Methods

- `generateResponse(request: GenerateRequest): Promise<GenerateResponse>`
- `generateResponseStream(request: GenerateRequest): AsyncGenerator<string>`
- `processContextualUpdate(context, files, messages): Promise<any>`
- `getStats(): GatewayStats`
- `cleanup(): Promise<void>`

### Configuration Types

```typescript
interface AIGatewayConfig {
  providers: AIProviderConfig[]
  defaultProvider: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  cache: CacheConfig
  rateLimiting: RateLimitConfig
  monitoring: MonitoringConfig
  healthCheck: HealthCheckConfig
  features: GatewayFeatures
}
```

### Request/Response Types

```typescript
interface GenerateRequest {
  prompt: string
  context?: RequestContext
  existing_files?: ProjectFile[]
  chat_history?: ChatMessage[]
  options?: GenerateOptions
}

interface GenerateResponse {
  success: boolean
  files: ProjectFile[]
  operations: FileOperation[]
  reasoning?: string
  confidence?: number
  next_steps?: string[]
  warnings?: string[]
  error?: string
}
```

## Performance Optimization

### Caching Strategies

1. **LRU (Least Recently Used)**: Default strategy, good for general use
2. **LFU (Least Frequently Used)**: Better for workloads with consistent patterns
3. **TTL (Time To Live)**: Cache entries expire after fixed time
4. **Adaptive**: Automatically selects best strategy based on usage patterns

### Rate Limiting Strategies

1. **Sliding Window**: Accurate rate limiting with time-based windows
2. **Fixed Window**: Simpler implementation, less accurate
3. **Token Bucket**: Allows bursts while maintaining average rate
4. **Adaptive**: Adjusts limits based on system load

### Monitoring Metrics

Key metrics to monitor:

- **Request Rate**: Requests per second/minute
- **Response Time**: P50, P95, P99 latencies
- **Cache Hit Rate**: Percentage of requests served from cache
- **Error Rate**: Percentage of failed requests
- **Token Usage**: Total tokens consumed
- **Cost**: Total API costs
- **Provider Health**: Availability and response times by provider

## Troubleshooting

### Common Issues

1. **Service Initialization Fails**
   - Check environment variables
   - Verify API keys are valid
   - Ensure required dependencies are installed

2. **High Error Rates**
   - Check provider health status
   - Review rate limit configuration
   - Monitor network connectivity

3. **Slow Response Times**
   - Check cache hit rates
   - Monitor provider performance
   - Review timeout configurations

4. **Memory Issues**
   - Adjust cache size limits
   - Monitor memory usage patterns
   - Consider using Redis for distributed caching

### Debug Mode

Enable debug logging:

```typescript
// In development
VITE_AI_GATEWAY_LOG_LEVEL=debug

// Or programmatically
const gatewayService = await getAIGatewayService()
const stats = gatewayService.getStats()
console.log('Gateway Debug Info:', stats)
```

## Migration Guide

### From Legacy AI Service

The AI Gateway provides backward compatibility with the existing AI service. Use the migration helper:

```typescript
import { AIMigrationHelper } from '@/examples/aiGatewayIntegration'

// Convert legacy request
const gatewayRequest = AIMigrationHelper.convertLegacyRequest(legacyRequest)

// Convert response back
const legacyResponse = AIMigrationHelper.convertLegacyResponse(gatewayResponse)
```

### Step-by-Step Migration

1. **Initialize AI Gateway**
   ```typescript
   await initializeAIGatewayForApp()
   ```

2. **Replace existing service calls**
   ```typescript
   // Before
   const response = await generateCodeWithAI(request)

   // After
   const response = await generateCodeWithGateway(request)
   ```

3. **Enable features gradually**
   - Start with basic functionality
   - Enable caching
   - Add rate limiting
   - Enable monitoring
   - Add streaming support

## Best Practices

### Performance

1. **Use caching** for similar requests
2. **Enable request deduplication** for concurrent duplicate requests
3. **Monitor metrics** regularly
4. **Set appropriate timeouts** for your use case
5. **Use streaming** for long responses

### Security

1. **Validate inputs** before processing
2. **Use content filtering** for sensitive applications
3. **Monitor for abuse** with rate limiting
4. **Secure API keys** and credentials
5. **Log security events**

### Reliability

1. **Implement circuit breakers** for provider failures
2. **Use retry logic** with exponential backoff
3. **Monitor health** of all components
4. **Have fallback strategies** for critical failures
5. **Test failure scenarios** regularly

## Contributing

### Development Setup

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Start development: `npm run dev`

### Testing

```bash
# Run all tests
npm test

# Run AI Gateway tests specifically
npm test -- aiGatewayService

# Run with coverage
npm run test:coverage
```

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add comprehensive tests
- Document public APIs
- Use meaningful commit messages

## Support

For issues and questions:

1. Check the [troubleshooting guide](#troubleshooting)
2. Review [API documentation](#api-reference)
3. Check [configuration guide](#configuration)
4. Create an issue in the repository

---

**Built with ❤️ for the CIN7 AI Playground**
*Enterprise-grade AI service management*