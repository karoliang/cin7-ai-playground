// Request validation middleware using JSON Schema

import { NextRequest, NextResponse } from 'next/server'
import { Schemas, SchemaName } from '../schemas'
import { ValidationError } from '../utils/errors'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Validate request data against a JSON schema
 */
export function validateSchema<T = any>(
  data: any,
  schemaName: SchemaName
): { data: T; errors?: ValidationError[] } {
  const schema = Schemas[schemaName]
  const errors = validateAgainstSchema(data, schema)

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }

  return { data: data as T }
}

/**
 * JSON Schema validator implementation
 */
function validateAgainstSchema(data: any, schema: any): ValidationError[] {
  const errors: ValidationError[] = []

  function validate(value: any, schema: any, path: string = ''): void {
    // Handle schema references
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/schemas/', '')
      const refSchema = (Schemas as any)[refPath]
      if (refSchema) {
        validate(value, refSchema, path)
      }
      return
    }

    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== schema.type) {
        errors.push(new ValidationError(
          `Expected type ${schema.type}, got ${actualType}`,
          path,
          'TYPE_MISMATCH'
        ))
        return
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(new ValidationError(
        `Value must be one of: ${schema.enum.join(', ')}`,
        path,
        'INVALID_ENUM_VALUE'
      ))
      return
    }

    // Required properties
    if (schema.required && typeof value === 'object' && value !== null) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push(new ValidationError(
            `Required property '${requiredProp}' is missing`,
            path ? `${path}.${requiredProp}` : requiredProp,
            'REQUIRED_PROPERTY_MISSING'
          ))
        }
      }
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(new ValidationError(
          `String must be at least ${schema.minLength} characters long`,
          path,
          'STRING_TOO_SHORT'
        ))
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(new ValidationError(
          `String must be at most ${schema.maxLength} characters long`,
          path,
          'STRING_TOO_LONG'
        ))
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern)
        if (!regex.test(value)) {
          errors.push(new ValidationError(
            `String does not match required pattern`,
            path,
            'PATTERN_MISMATCH'
          ))
        }
      }

      if (schema.format) {
        if (!validateFormat(value, schema.format)) {
          errors.push(new ValidationError(
            `String does not match required format: ${schema.format}`,
            path,
            'FORMAT_MISMATCH'
          ))
        }
      }
    }

    // Number validations
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(new ValidationError(
          `Number must be at least ${schema.minimum}`,
          path,
          'NUMBER_TOO_SMALL'
        ))
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(new ValidationError(
          `Number must be at most ${schema.maximum}`,
          path,
          'NUMBER_TOO_LARGE'
        ))
      }

      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push(new ValidationError(
          'Number must be an integer',
          path,
          'INTEGER_REQUIRED'
        ))
      }
    }

    // Array validations
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(new ValidationError(
          `Array must have at least ${schema.minItems} items`,
          path,
          'ARRAY_TOO_SHORT'
        ))
      }

      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(new ValidationError(
          `Array must have at most ${schema.maxItems} items`,
          path,
          'ARRAY_TOO_LONG'
        ))
      }

      // Validate array items
      if (schema.items) {
        value.forEach((item, index) => {
          validate(item, schema.items, `${path}[${index}]`)
        })
      }
    }

    // Object validations
    if (schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Validate each property
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in value) {
            validate(value[propName], propSchema, path ? `${path}.${propName}` : propName)
          }
        }
      }

      // Check for additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(schema.properties || {}))
        const actualProps = Object.keys(value)

        for (const prop of actualProps) {
          if (!allowedProps.has(prop)) {
            errors.push(new ValidationError(
              `Additional property not allowed: ${prop}`,
              path ? `${path}.${prop}` : prop,
              'ADDITIONAL_PROPERTY_NOT_ALLOWED'
            ))
          }
        }
      }

      // Pattern properties
      if (schema.patternProperties) {
        for (const [pattern, propSchema] of Object.entries(schema.patternProperties)) {
          const regex = new RegExp(pattern)
          for (const [propName, propValue] of Object.entries(value)) {
            if (regex.test(propName)) {
              validate(propValue, propSchema, path ? `${path}.${propName}` : propName)
            }
          }
        }
      }
    }

    // Conditional validations
    if (schema.anyOf) {
      const anyOfErrors: ValidationError[][] = []
      let isValid = false

      for (const subSchema of schema.anyOf) {
        const subErrors: ValidationError[] = []
        const tempErrors = errors.splice(0, errors.length) // Temporarily clear errors

        validate(value, subSchema, path)

        if (errors.length === 0) {
          isValid = true
          errors.push(...tempErrors) // Restore previous errors
          break
        } else {
          anyOfErrors.push([...errors])
          errors.length = 0
          errors.push(...tempErrors) // Restore previous errors
        }
      }

      if (!isValid && anyOfErrors.length > 0) {
        // Add all errors from anyOf validation attempts
        for (const errorSet of anyOfErrors) {
          errors.push(...errorSet)
        }
        errors.push(new ValidationError(
          'Value must match at least one of the provided schemas',
          path,
          'ANY_OF_VALIDATION_FAILED'
        ))
      }
    }
  }

  validate(data, schema)
  return errors
}

/**
 * Validate string formats
 */
function validateFormat(value: string, format: string): boolean {
  switch (format) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)

    case 'uri':
      try {
        new URL(value)
        return true
      } catch {
        return false
      }

    case 'uuid':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      return uuidRegex.test(value)

    case 'date-time':
      const date = new Date(value)
      return !isNaN(date.getTime()) && value.includes('T') && (value.includes('Z') || value.includes('+'))

    case 'date':
      const dateOnly = new Date(value)
      return !isNaN(dateOnly.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value)

    default:
      return true // Unknown formats pass validation
  }
}

/**
 * Middleware factory for request body validation
 */
export function withValidation<T = any>(
  schemaName: SchemaName,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (
    handler: (request: NextRequest, context: any, data: T) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context: any): Promise<NextResponse> => {
      try {
        let data: any

        // Extract data from specified source
        switch (source) {
          case 'body':
            const contentType = request.headers.get('content-type')
            if (contentType?.includes('application/json')) {
              const body = await request.text()
              if (body) {
                data = JSON.parse(body)
              } else {
                data = {}
              }
            } else {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Content-Type must be application/json',
                  code: 'INVALID_CONTENT_TYPE',
                  timestamp: new Date().toISOString()
                },
                { status: 400 }
              )
            }
            break

          case 'query':
            const { searchParams } = new URL(request.url)
            data = Object.fromEntries(searchParams.entries())
            // Convert string values to appropriate types
            data = convertQueryTypes(data, schemaName)
            break

          case 'params':
            // For path parameters, we need to extract them from the URL
            // This would typically be handled by the routing framework
            const url = new URL(request.url)
            data = extractPathParams(url.pathname, request.method, schemaName)
            break

          default:
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid validation source',
                code: 'INVALID_VALIDATION_SOURCE',
                timestamp: new Date().toISOString()
              },
              { status: 500 }
            )
        }

        // Validate the data
        const { data: validatedData } = validateSchema<T>(data, schemaName)

        return handler(request, context, validatedData)
      } catch (error) {
        if (error instanceof ValidationError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.errors.map(err => ({
                field: err.field,
                message: err.message,
                code: err.code
              })),
              timestamp: new Date().toISOString()
            },
            { status: 422 }
          )
        }

        console.error('Validation middleware error:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Convert query string parameters to appropriate types
 */
function convertQueryTypes(query: Record<string, string>, schemaName: SchemaName): any {
  const schema = Schemas[schemaName]
  const converted: any = {}

  for (const [key, value] of Object.entries(query)) {
    if (schema.properties && schema.properties[key]) {
      const propSchema = schema.properties[key]
      converted[key] = convertType(value, propSchema)
    } else {
      converted[key] = value
    }
  }

  return converted
}

/**
 * Convert a string value to the appropriate type based on schema
 */
function convertType(value: string, schema: any): any {
  if (schema.type === 'boolean') {
    return value === 'true' || value === '1'
  }

  if (schema.type === 'integer') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? value : parsed
  }

  if (schema.type === 'number') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? value : parsed
  }

  if (schema.type === 'array') {
    return value.split(',').map(item => item.trim())
  }

  return value
}

/**
 * Extract path parameters from URL
 * This is a simplified implementation - in practice, you'd use your routing framework
 */
function extractPathParams(pathname: string, method: string, schemaName: SchemaName): any {
  const params: any = {}

  // Example: Extract project ID from /api/v1/projects/123
  const projectMatch = pathname.match(/\/api\/v1\/projects\/([^\/]+)/)
  if (projectMatch) {
    params.projectId = projectMatch[1]
  }

  // Example: Extract file ID from /api/v1/projects/123/files/456
  const fileMatch = pathname.match(/\/api\/v1\/projects\/[^\/]+\/files\/([^\/]+)/)
  if (fileMatch) {
    params.fileId = fileMatch[1]
  }

  return params
}

/**
 * Validate multiple schemas (for complex requests)
 */
export function withMultiValidation<T extends Record<string, any>>(
  validations: Array<{ schemaName: SchemaName; source: 'body' | 'query' | 'params'; key?: keyof T }>
) {
  return (
    handler: (request: NextRequest, context: any, data: T) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context: any): Promise<NextResponse> => {
      try {
        const data: any = {}

        for (const validation of validations) {
          let rawData: any

          // Extract data from specified source
          switch (validation.source) {
            case 'body':
              const contentType = request.headers.get('content-type')
              if (contentType?.includes('application/json')) {
                const body = await request.text()
                rawData = body ? JSON.parse(body) : {}
              } else {
                throw new Error('Content-Type must be application/json')
              }
              break

            case 'query':
              const { searchParams } = new URL(request.url)
              rawData = Object.fromEntries(searchParams.entries())
              rawData = convertQueryTypes(rawData, validation.schemaName)
              break

            case 'params':
              const url = new URL(request.url)
              rawData = extractPathParams(url.pathname, request.method, validation.schemaName)
              break
          }

          // Validate the data
          const { data: validatedData } = validateSchema(rawData, validation.schemaName)

          // Store in result object
          if (validation.key) {
            data[validation.key] = validatedData
          } else {
            Object.assign(data, validatedData)
          }
        }

        return handler(request, context, data)
      } catch (error) {
        if (error instanceof ValidationError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: error.errors.map(err => ({
                field: err.field,
                message: err.message,
                code: err.code
              })),
              timestamp: new Date().toISOString()
            },
            { status: 422 }
          )
        }

        if (error instanceof Error && error.message === 'Content-Type must be application/json') {
          return NextResponse.json(
            {
              success: false,
              error: error.message,
              code: 'INVALID_CONTENT_TYPE',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          )
        }

        console.error('Multi-validation middleware error:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
      }
    }
  }
}