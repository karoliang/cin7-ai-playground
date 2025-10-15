// Custom error classes for API handling

export class APIError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly timestamp: string

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()

    // Ensure the stack trace is properly captured
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    }
  }
}

export class ValidationError extends APIError {
  public readonly errors: ValidationErrorDetail[]

  constructor(
    message: string = 'Validation failed',
    errors: ValidationErrorDetail[] = [],
    details?: Record<string, any>
  ) {
    super(message, 422, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
    this.errors = errors
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: {
        ...this.details,
        validation_errors: this.errors.map(err => ({
          field: err.field,
          message: err.message,
          code: err.code,
          value: err.value
        }))
      }
    }
  }
}

export interface ValidationErrorDetail {
  field: string
  message: string
  code: string
  value?: any
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 401, 'UNAUTHORIZED', details)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(message, 403, 'FORBIDDEN', details)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource', identifier?: string) {
    const message = identifier ? `${resource} with ID '${identifier}' not found` : `${resource} not found`
    super(message, 404, 'NOT_FOUND', { resource, identifier })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends APIError {
  public readonly retryAfter: number

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    details?: Record<string, any>
  ) {
    super(message, 429, 'RATE_LIMITED', {
      ...details,
      retry_after: retryAfter
    })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class BadRequestError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'BAD_REQUEST', details)
    this.name = 'BadRequestError'
  }
}

export class UnsupportedMediaTypeError extends APIError {
  constructor(mediaType: string, supportedTypes?: string[]) {
    super(
      `Unsupported media type: ${mediaType}`,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      { media_type: mediaType, supported_types: supportedTypes }
    )
    this.name = 'UnsupportedMediaTypeError'
  }
}

export class TooManyRequestsError extends APIError {
  constructor(message: string = 'Too many requests', details?: Record<string, any>) {
    super(message, 429, 'TOO_MANY_REQUESTS', details)
    this.name = 'TooManyRequestsError'
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(service: string, details?: Record<string, any>) {
    super(
      `Service '${service}' is currently unavailable`,
      503,
      'SERVICE_UNAVAILABLE',
      { service, ...details }
    )
    this.name = 'ServiceUnavailableError'
  }
}

export class DatabaseError extends APIError {
  constructor(message: string = 'Database operation failed', details?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', details)
    this.name = 'DatabaseError'
  }
}

export class ExternalServiceError extends APIError {
  constructor(
    service: string,
    message: string = `External service '${service}' error`,
    details?: Record<string, any>
  ) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details })
    this.name = 'ExternalServiceError'
  }
}

export class TimeoutError extends APIError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      408,
      'TIMEOUT',
      { operation, timeout }
    )
    this.name = 'TimeoutError'
  }
}

export class FileUploadError extends APIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details)
    this.name = 'FileUploadError'
  }
}

export class QuotaExceededError extends APIError {
  constructor(resource: string, limit: number, current: number) {
    super(
      `Quota exceeded for ${resource}. Limit: ${limit}, Current: ${current}`,
      429,
      'QUOTA_EXCEEDED',
      { resource, limit, current }
    )
    this.name = 'QuotaExceededError'
  }
}

export class MaintenanceError extends APIError {
  constructor(message: string = 'Service is under maintenance') {
    super(message, 503, 'MAINTENANCE', {
      retry_after: 3600 // 1 hour default
    })
    this.name = 'MaintenanceError'
  }
}

/**
 * Error factory functions for common scenarios
 */
export const ErrorFactory = {
  // Authentication errors
  unauthorized: (message?: string) => new AuthenticationError(message),
  forbidden: (action?: string, resource?: string) =>
    new AuthorizationError(
      action && resource
        ? `Cannot perform '${action}' on '${resource}'`
        : 'Insufficient permissions'
    ),

  // Validation errors
  validation: (errors: ValidationErrorDetail[]) => new ValidationError(errors.length > 0 ? errors[0].message : 'Validation failed', errors),
  requiredField: (field: string) => new ValidationError(`Field '${field}' is required`, [{ field, message: 'This field is required', code: 'REQUIRED' }]),
  invalidFormat: (field: string, format: string) =>
    new ValidationError(`Field '${field}' must be in ${format} format`, [{ field, message: `Invalid format`, code: 'INVALID_FORMAT' }]),

  // Resource errors
  NotFoundError: (resource: string, id?: string) => new NotFoundError(resource, id),
  AuthorizationError: (message?: string) => new AuthorizationError(message),
  notFound: (resource: string, id?: string) => new NotFoundError(resource, id),
  alreadyExists: (resource: string, field: string, value: any) =>
    new ConflictError(`${resource} with ${field} '${value}' already exists`, { resource, field, value }),
  conflict: (message: string) => new ConflictError(message),

  // Rate limiting and quota errors
  rateLimited: (retryAfter: number = 60) => new RateLimitError('Rate limit exceeded', retryAfter),
  quotaExceeded: (resource: string, limit: number, current: number) => new QuotaExceededError(resource, limit, current),

  // File errors
  fileTooLarge: (size: number, maxSize: number) =>
    new FileUploadError(`File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`, { size, max_size: maxSize }),
  unsupportedFileType: (type: string, supportedTypes: string[]) =>
    new FileUploadError(`Unsupported file type: ${type}`, { type, supported_types: supportedTypes }),

  // Service errors
  serviceUnavailable: (service: string) => new ServiceUnavailableError(service),
  databaseError: (message?: string) => new DatabaseError(message),
  externalServiceError: (service: string, message?: string) => new ExternalServiceError(service, message),
  timeout: (operation: string, timeout: number) => new TimeoutError(operation, timeout),

  // Bad request errors
  badRequest: (message: string) => new BadRequestError(message),
  invalidJSON: () => new BadRequestError('Invalid JSON in request body'),
  missingField: (field: string) => new BadRequestError(`Missing required field: ${field}`),

  // Maintenance
  maintenance: (message?: string) => new MaintenanceError(message)
}

/**
 * Convert any error to an APIError
 */
export function toAPIError(error: unknown): APIError {
  if (error instanceof APIError) {
    return error
  }

  if (error instanceof Error) {
    // Handle known error types
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message)
    }

    if (error.name === 'TypeError') {
      return new BadRequestError(`Invalid data type: ${error.message}`)
    }

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return new BadRequestError('Invalid JSON format')
    }

    // Generic error
    return new APIError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      500,
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'production' ? undefined : { original_error: error.message, stack: error.stack }
    )
  }

  // Non-Error object
  return new APIError(
    'An unexpected error occurred',
    500,
    'UNKNOWN_ERROR',
    { original_value: error }
  )
}

/**
 * Check if an error is a specific type
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

/**
 * Error handler for Express/Next.js middleware
 */
export function errorHandler(error: unknown): APIError {
  const apiError = toAPIError(error)

  // Log the error for debugging
  console.error('API Error:', {
    name: apiError.name,
    message: apiError.message,
    code: apiError.code,
    statusCode: apiError.statusCode,
    details: apiError.details,
    stack: apiError.stack
  })

  return apiError
}