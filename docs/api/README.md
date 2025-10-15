# CIN7 AI Playground API Documentation

Welcome to the CIN7 AI Playground API documentation. This comprehensive RESTful API provides access to all features of the CIN7 AI Playground platform, including project management, AI-powered code generation, file operations, and user management.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [API Versioning](#api-versioning)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Projects](#projects)
  - [AI Integration](#ai-integration)
  - [File Management](#file-management)
  - [User Management](#user-management)
- [SDKs and Libraries](#sdks-and-libraries)
- [Examples](#examples)
- [Testing](#testing)
- [Changelog](#changelog)

## Overview

The CIN7 AI Playground API is a RESTful API that uses JSON for requests and responses. It provides programmatic access to all platform features, making it easy to integrate the AI playground into your applications and workflows.

### Key Features

- **Project Management**: Create, read, update, and delete projects
- **AI Integration**: Generate code, chat with AI, and analyze code
- **File Operations**: Manage project files with full CRUD operations
- **User Management**: Handle user profiles and settings
- **Real-time Features**: Streaming responses for AI interactions
- **Comprehensive Validation**: Request/response validation with detailed error messages
- **Enterprise-grade Security**: JWT authentication, rate limiting, and audit logging

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. You need to include a valid JWT token in the Authorization header of your requests.

### Getting a Token

To get an API token, users need to authenticate through the CIN7 AI Playground web interface or use the authentication endpoints.

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Token Expiration

JWT tokens expire after a configured time period. When a token expires, you'll receive a 401 Unauthorized response. You should implement token refresh logic in your application.

## Base URL

The API base URL depends on the environment:

- **Production**: `https://api.cin7-ai-playground.com/v1`
- **Staging**: `https://staging-api.cin7-ai-playground.com/v1`
- **Development**: `http://localhost:3000/api/v1`

All API endpoints are relative to the base URL.

## API Versioning

The API uses URL path versioning. The current version is `v1`. Include the version in the URL:

```
https://api.cin7-ai-playground.com/v1/projects
```

### Version Compatibility

We maintain backward compatibility within major versions. When breaking changes are necessary, we'll release a new major version (v2, v3, etc.).

## Rate Limiting

To ensure fair usage and system stability, the API implements rate limiting:

### Default Limits

- **General API**: 100 requests per minute per user
- **AI Endpoints**: 10 requests per minute per user
- **File Operations**: 20 requests per minute per user
- **Authentication**: 5 requests per 15 minutes per IP

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Current: 15
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

### Handling Rate Limits

When you exceed the rate limit, you'll receive a 429 Too Many Requests response with a `Retry-After` header indicating when you can make the next request.

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses.

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication required or invalid |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict |
| 422 | VALIDATION_ERROR | Request validation failed |
| 429 | RATE_LIMITED | Rate limit exceeded |
| 500 | INTERNAL_SERVER_ERROR | Server error |

### Validation Errors

For validation errors (422), the `details` field includes specific validation errors:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "Name is required",
      "code": "REQUIRED_PROPERTY_MISSING"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## API Endpoints

### Projects

Manage projects in the CIN7 AI Playground.

#### List Projects

```http
GET /projects
```

**Query Parameters:**
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by project status
- `search` (string, optional): Search term for project names/descriptions
- `sort` (string, optional): Sort field (created_at, updated_at, name)
- `order` (string, optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Create Project

```http
POST /projects
```

**Request Body:**
```json
{
  "name": "My Project",
  "description": "A sample project",
  "prompt": "Create a React application",
  "template": "blank",
  "framework": "react",
  "settings": {
    "theme": {
      "mode": "light"
    }
  }
}
```

#### Get Project

```http
GET /projects/{projectId}
```

#### Update Project

```http
PUT /projects/{projectId}
```

#### Delete Project

```http
DELETE /projects/{projectId}
```

### AI Integration

AI-powered features for code generation and assistance.

#### Generate Code

```http
POST /ai/generate
```

**Request Body:**
```json
{
  "prompt": "Create a responsive navigation bar",
  "existing_files": [...],
  "chat_history": [...],
  "context": {
    "framework": "react",
    "template": "e-commerce"
  },
  "options": {
    "temperature": 0.7,
    "max_tokens": 2000,
    "include_tests": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "files": [...],
    "operations": [...],
    "reasoning": "Created a responsive navigation bar...",
    "confidence": 0.95,
    "next_steps": [...]
  }
}
```

#### Chat with AI

```http
POST /ai/chat
```

#### Get AI Models

```http
GET /ai/models
```

#### Analyze Code

```http
POST /ai/analyze
```

### File Management

Manage files within projects.

#### List Project Files

```http
GET /projects/{projectId}/files
```

#### Create File

```http
POST /projects/{projectId}/files
```

#### Get File

```http
GET /projects/{projectId}/files/{fileId}
```

#### Update File

```http
PUT /projects/{projectId}/files/{fileId}
```

#### Delete File

```http
DELETE /projects/{projectId}/files/{fileId}
```

#### Upload File

```http
POST /projects/{projectId}/files/upload
```

**Request:** multipart/form-data with file field.

### User Management

Manage user profiles and settings.

#### Get User Profile

```http
GET /users/profile
```

#### Update User Profile

```http
PUT /users/profile
```

#### Get User Settings

```http
GET /users/settings
```

#### Update User Settings

```http
PUT /users/settings
```

## SDKs and Libraries

We provide official SDKs for popular programming languages:

### JavaScript/TypeScript

```bash
npm install @cin7-ai-playground/api-client
```

```typescript
import { APIClient } from '@cin7-ai-playground/api-client'

const client = new APIClient({
  baseURL: 'https://api.cin7-ai-playground.com/v1',
  authToken: 'your-jwt-token'
})

const projects = await client.getProjects()
```

### Python

```bash
pip install cin7-ai-playground
```

```python
from cin7_ai_playground import APIClient

client = APIClient(
    base_url='https://api.cin7-ai-playground.com/v1',
    auth_token='your-jwt-token'
)

projects = client.get_projects()
```

## Examples

### Creating a Project with AI Generation

```javascript
const client = new APIClient({ authToken: 'your-token' })

// 1. Create a project
const project = await client.createProject({
  name: 'E-commerce Site',
  description: 'Modern e-commerce website',
  framework: 'react',
  template: 'e-commerce'
})

// 2. Generate initial code
const generated = await client.generateCode({
  prompt: 'Create a product listing page with filters',
  context: {
    project_id: project.id,
    framework: 'react'
  }
})

// 3. Create files from generation
for (const file of generated.files) {
  await client.createProjectFile(project.id, file)
}
```

### Streaming AI Responses

```javascript
const client = new APIClient({ authToken: 'your-token' })

// Stream chat responses
for await (const chunk of client.streamChat({
  message: 'Help me optimize this React component',
  project_id: 'project-id'
})) {
  console.log(chunk.message)
}
```

### File Upload

```javascript
const client = new APIClient({ authToken: 'your-token' })

const file = document.getElementById('file-input').files[0]
const uploadedFile = await client.uploadFile('project-id', file, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`)
  }
})
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/api/__tests__/apiClient.test.ts
```

### Test Environment

The API includes comprehensive test coverage:

- Unit tests for all API services
- Integration tests for middleware
- End-to-end tests for complete workflows
- Performance tests for rate limiting and timeouts

### Mock Data

The test suite includes comprehensive mock data and helpers for testing API interactions.

## Changelog

### v2.0.0 (Current)
- Complete API redesign with RESTful architecture
- Added comprehensive validation and error handling
- Implemented rate limiting and security features
- Added streaming support for AI responses
- Introduced file upload and management capabilities

### v1.x.x (Legacy)
- Basic project management
- Simple AI integration
- Limited validation and error handling

## Support

For API support and questions:

- **Documentation**: [docs.cin7-ai-playground.com](https://docs.cin7-ai-playground.com)
- **Issues**: [GitHub Issues](https://github.com/karoliang/cin7-ai-playground/issues)
- **Discussions**: [GitHub Discussions](https://github.com/karoliang/cin7-ai-playground/discussions)
- **Email**: api-support@cin7-ai-playground.com

## License

The CIN7 AI Playground API is licensed under the ISC License. See the [LICENSE](https://github.com/karoliang/cin7-ai-playground/blob/main/LICENSE) file for details.