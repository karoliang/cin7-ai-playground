// Validation middleware tests

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withValidation, validateSchema } from '../middleware/validation'
import { Schemas } from '../schemas'
import { ValidationError } from '../utils/errors'
import { mockRequest } from '../utils/testHelpers'

describe('Validation Middleware', () => {
  let mockHandler: ReturnType<typeof vi.fn>
  let mockContext: any

  beforeEach(() => {
    mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true, data: 'validated' })
    )
    mockContext = { user: { id: 'test-user-id' } }
  })

  describe('withValidation', () => {
    it('should validate request body successfully', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { name: 'Test Project' }
      })

      const response = await middleware(request, mockContext)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, {
        name: 'Test Project'
      })
    })

    it('should reject invalid request body', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {} // Missing required 'name' field
      })

      const response = await middleware(request, mockContext)

      expect(response.status).toBe(422)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.code).toBe('VALIDATION_ERROR')
      expect(json.details).toBeDefined()
    })

    it('should validate query parameters', async () => {
      const middleware = withValidation('PaginationParams', 'query')
      const request = mockRequest({
        url: 'https://api.example.com/test?page=1&limit=20'
      })

      const response = await middleware(request, mockContext)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, {
        page: 1,
        limit: 20,
        order: 'desc'
      })
    })

    it('should handle non-JSON content types', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'plain text'
      })

      const response = await middleware(request, mockContext)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.code).toBe('INVALID_CONTENT_TYPE')
    })

    it('should handle empty request body', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: ''
      })

      const response = await middleware(request, mockContext)

      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, {})
    })

    it('should convert query parameter types', async () => {
      const middleware = withValidation('PaginationParams', 'query')
      const request = mockRequest({
        url: 'https://api.example.com/test?page=2&limit=10&order=asc'
      })

      await middleware(request, mockContext)

      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, {
        page: 2,
        limit: 10,
        order: 'asc'
      })
    })
  })

  describe('validateSchema', () => {
    it('should validate valid data', () => {
      const data = { name: 'Test Project', description: 'A test project' }
      const result = validateSchema(data, 'CreateProjectRequest')

      expect(result.data).toEqual(data)
      expect(result.errors).toBeUndefined()
    })

    it('should throw ValidationError for invalid data', () => {
      const data = {} // Missing required 'name' field

      expect(() => {
        validateSchema(data, 'CreateProjectRequest')
      }).toThrow(ValidationError)
    })

    it('should validate string constraints', () => {
      const data = { name: '' } // Empty name (fails minLength)

      try {
        validateSchema(data, 'CreateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('name')
        expect((error as ValidationError).errors[0].code).toBe('STRING_TOO_SHORT')
      }
    })

    it('should validate array constraints', () => {
      const data = { tags: Array(11).fill('tag') } // Too many tags

      try {
        validateSchema(data, 'UpdateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('metadata.tags')
        expect((error as ValidationError).errors[0].code).toBe('ARRAY_TOO_LONG')
      }
    })

    it('should validate number constraints', () => {
      const data = { temperature: 3 } // Temperature too high

      try {
        validateSchema(data, 'GenerateOptions')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('temperature')
        expect((error as ValidationError).errors[0].code).toBe('NUMBER_TOO_LARGE')
      }
    })

    it('should validate enum values', () => {
      const data = { framework: 'invalid-framework' }

      try {
        validateSchema(data, 'CreateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('framework')
        expect((error as ValidationError).errors[0].code).toBe('INVALID_ENUM_VALUE')
      }
    })

    it('should validate UUID format', () => {
      const data = { project_id: 'invalid-uuid' }

      try {
        validateSchema(data, 'RequestContext')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('project_id')
        expect((error as ValidationError).errors[0].code).toBe('FORMAT_MISMATCH')
      }
    })

    it('should validate email format', () => {
      const data = { email: 'invalid-email' }

      try {
        validateSchema(data, 'UpdateProfileRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('email')
        expect((error as ValidationError).errors[0].code).toBe('FORMAT_MISMATCH')
      }
    })

    it('should validate pattern constraints', () => {
      const data = { name: 'Invalid@Name!' }

      try {
        validateSchema(data, 'CreateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('name')
        expect((error as ValidationError).errors[0].code).toBe('PATTERN_MISMATCH')
      }
    })

    it('should validate nested objects', () => {
      const data = {
        settings: {
          theme: {
            primary_color: 'invalid-color' // Not a valid hex color
          }
        }
      }

      try {
        validateSchema(data, 'CreateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('settings.theme.primary_color')
        expect((error as ValidationError).errors[0].code).toBe('PATTERN_MISMATCH')
      }
    })

    it('should validate additional properties', () => {
      const data = {
        name: 'Test Project',
        invalidProperty: 'should not be allowed'
      }

      try {
        validateSchema(data, 'CreateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors).toHaveLength(1)
        expect((error as ValidationError).errors[0].field).toBe('invalidProperty')
        expect((error as ValidationError).errors[0].code).toBe('ADDITIONAL_PROPERTY_NOT_ALLOWED')
      }
    })

    it('should handle schema references', () => {
      const data = {
        files: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'index.html',
            type: 'html',
            content: '<html></html>'
          }
        ]
      }

      try {
        validateSchema(data, 'GenerateRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).errors[0].field).toBe('files[0].created_at')
        expect((error as ValidationError).errors[0].code).toBe('REQUIRED_PROPERTY_MISSING')
      }
    })

    it('should validate anyOf schemas', () => {
      const data = {
        // This should fail both string and array validation
        files: 123
      }

      try {
        validateSchema(data, 'UpdateProjectRequest')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        // Should have errors from both attempted validations
        expect((error as ValidationError).errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('error handling', () => {
    it('should return proper error response format', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {}
      })

      const response = await middleware(request, mockContext)
      const json = await response.json()

      expect(json).toMatchObject({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String)
      })

      expect(json.details).toBeInstanceOf(Array)
      expect(json.details[0]).toMatchObject({
        field: expect.any(String),
        message: expect.any(String),
        code: expect.any(String)
      })
    })

    it('should handle JSON parsing errors', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json'
      })

      // Mock text method to return invalid JSON
      request.text = vi.fn().mockResolvedValue('invalid json')

      const response = await middleware(request, mockContext)

      expect(response.status).toBe(422)
      const json = await response.json()
      expect(json.code).toBe('VALIDATION_ERROR')
    })

    it('should handle request read errors', async () => {
      const middleware = withValidation('CreateProjectRequest', 'body')
      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      })

      // Mock text method to throw error
      request.text = vi.fn().mockRejectedValue(new Error('Read error'))

      const response = await middleware(request, mockContext)

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })

  describe('complex validation scenarios', () => {
    it('should validate complex nested objects', async () => {
      const middleware = withValidation('UpdateProjectRequest', 'body')
      const validData = {
        metadata: {
          architecture: {
            type: 'multi-page',
            pages: [
              {
                id: 'home',
                name: 'Home',
                path: '/',
                title: 'Home Page'
              }
            ],
            routing: {
              type: 'client-side',
              routes: [
                {
                  path: '/',
                  component: 'Home'
                }
              ]
            }
          },
          build_config: {
            bundler: 'vite',
            minify: true,
            sourcemap: true
          }
        }
      }

      const request = mockRequest({
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: validData
      })

      const response = await middleware(request, mockContext)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, validData)
    })

    it('should validate file creation requests', async () => {
      const middleware = withValidation('CreateFileRequest', 'body')
      const validFile = {
        name: 'index.html',
        type: 'html',
        content: '<html><body>Hello World</body></html>',
        path: '/index.html'
      }

      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: validFile
      })

      const response = await middleware(request, mockContext)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request, mockContext, validFile)
    })

    it('should reject oversized content', async () => {
      const middleware = withValidation('CreateFileRequest', 'body')
      const largeContent = 'x'.repeat(1000001) // Over 1MB limit

      const request = mockRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          name: 'large.txt',
          type: 'txt',
          content: largeContent
        }
      })

      const response = await middleware(request, mockContext)

      expect(response.status).toBe(422)
      const json = await response.json()
      expect(json.details[0].code).toBe('STRING_TOO_LONG')
    })
  })
})