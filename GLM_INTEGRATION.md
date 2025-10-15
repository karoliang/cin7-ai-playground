# GLM (ZhipuAI) Integration Guide

This document provides comprehensive information about the GLM SDK integration in the CIN7 AI Playground project.

## Overview

The project now supports GLM (ZhipuAI) models for AI-powered code generation. GLM-4 is a powerful large language model that excels at code generation, contextual updates, and multi-modal tasks.

## Installation

The GLM SDK is already included in the project dependencies:

```bash
npm install zhipu-sdk-js@1.0.0
```

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```env
# GLM (ZhipuAI) Configuration
VITE_GLM_API_KEY=your_glm_api_key_here
VITE_GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
VITE_GLM_TIMEOUT=30000
VITE_GLM_RETRY_ATTEMPTS=3
VITE_GLM_RETRY_DELAY=1000
VITE_GLM_ENABLE_LOGGING=true

# AI Provider Selection
VITE_AI_PROVIDER=glm
VITE_DEFAULT_AI_MODEL=glm-4
```

### Getting Your API Key

1. Visit [ZhipuAI](https://open.bigmodel.cn/)
2. Create an account or sign in
3. Navigate to the API keys section
4. Generate a new API key
5. Copy the key to your `.env` file

## Available Models

- `glm-4-plus` - Most capable model
- `glm-4-0520` - Stable version
- `glm-4` - Standard model (default)
- `glm-4-air` - Efficient model
- `glm-4-airx` - Extra efficient
- `glm-4-long` - Long context
- `glm-4-flashx` - Fast generation
- `glm-4-flash` - Fastest model
- `glm-4v-plus` - Vision capable
- `glm-4v` - Standard vision
- `glm-3-turbo` - Legacy model

## Usage

### Basic Code Generation

```typescript
import { getGLMService, createGLMConfigFromEnv } from '@/services/glmService'

// Initialize the service
const config = createGLMConfigFromEnv()
const glmService = getGLMService(config)

// Generate code
const request = {
  prompt: 'Create a React component for a user profile',
  context: {
    framework: 'react',
    template: 'dashboard'
  }
}

const response = await glmService.generateCode(request)
```

### Contextual Updates

```typescript
const context = { project_type: 'react' }
const files = [{ id: '1', name: 'App.tsx', content: '...', type: 'tsx' }]
const messages = [{ role: 'user', content: 'Add dark mode support' }]

const result = await glmService.processContextualUpdate(context, files, messages)
```

### Streaming Generation

```typescript
const generator = glmService.generateCodeStream(request)

for await (const chunk of generator) {
  console.log(chunk) // Stream the generated code
}
```

## Features

### Supported Features

- ✅ Chat completion
- ✅ Streaming responses
- ✅ Function calling
- ✅ JSON mode
- ✅ Vision models
- ✅ Code generation
- ✅ Contextual updates

### Advanced Features

#### Metrics and Monitoring

```typescript
// Get service health
const health = glmService.getHealthStatus()

// Get request metrics
const metrics = glmService.getRequestMetrics()

// Clear metrics
glmService.clearMetrics()
```

#### Error Handling

The service includes comprehensive error handling with:

- Automatic retries
- Fallback responses
- Detailed error messages
- Request logging

## Architecture

### Service Structure

```
src/
├── services/
│   ├── glmService.ts          # Main GLM service implementation
│   ├── aiService.ts           # AI service abstraction layer
│   └── __tests__/
│       └── glmService.test.ts # Comprehensive test suite
├── types/
│   └── glm.ts                 # GLM-specific type definitions
└── test-glm-integration.ts    # Integration test script
```

### AI Provider Abstraction

The project uses an abstraction layer that allows switching between AI providers:

```typescript
// Environment variable controls the provider
VITE_AI_PROVIDER=glm  // or 'supabase'
```

## Testing

### Run Tests

```bash
# Run GLM service tests
npm test -- glmService.test.ts

# Run integration test
npx tsx src/test-glm-integration.ts
```

### Test Coverage

The test suite includes:

- Configuration validation
- Service initialization
- Code generation
- Contextual updates
- Error handling
- Metrics collection
- Health checks

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```
   Error: VITE_GLM_API_KEY environment variable is required
   ```
   **Solution**: Ensure your `.env` file contains a valid GLM API key.

2. **Invalid API Key**
   ```
   Error: API key appears to be invalid
   ```
   **Solution**: Verify your API key is correct and has sufficient permissions.

3. **Connection Timeout**
   ```
   Error: Request timeout
   ```
   **Solution**: Increase `VITE_GLM_TIMEOUT` or check your network connection.

4. **Model Not Available**
   ```
   Error: Model not found
   ```
   **Solution**: Use a supported model from the list above.

### Debug Mode

Enable detailed logging:

```env
VITE_GLM_ENABLE_LOGGING=true
```

### Health Check

```typescript
const isHealthy = await glmService.testConnection()
console.log('Service health:', isHealthy)
```

## Best Practices

### Performance

- Use `glm-4-flash` for faster responses
- Implement proper caching for repeated requests
- Monitor token usage and costs

### Security

- Never expose API keys in client-side code
- Use environment variables for sensitive configuration
- Implement proper error handling for API failures

### Code Quality

- Always validate AI-generated code
- Use TypeScript for type safety
- Implement comprehensive testing

## API Reference

### GLMService Class

#### Methods

- `generateCode(request: GenerateRequest): Promise<GenerateResponse>`
- `processContextualUpdate(context, files, messages): Promise<any>`
- `generateCodeStream(request): AsyncGenerator<string>`
- `testConnection(): Promise<boolean>`
- `getHealthStatus(): GLMServiceHealth`
- `getRequestMetrics(): GLMRequestMetrics[]`
- `clearMetrics(): void`

#### Configuration Options

```typescript
interface GLMConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}
```

## Contributing

When contributing to the GLM integration:

1. Ensure all tests pass
2. Update documentation for new features
3. Follow TypeScript best practices
4. Test with different GLM models
5. Verify backward compatibility

## License

This integration follows the same license as the main project. The GLM SDK is licensed under MIT.