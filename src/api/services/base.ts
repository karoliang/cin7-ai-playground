// Base API service class

import { NextRequest, NextResponse } from 'next/server'
import { APIResponse, PaginationParams, PaginatedResponse } from '../types/api'
import { APIError, toAPIError } from '../utils/errors'
import { config } from '../config'

export abstract class BaseService {
  protected baseURL: string
  protected timeout: number
  protected retries: number
  protected retryDelay: number

  constructor() {
    this.baseURL = config.baseURL
    this.timeout = config.timeout
    this.retries = config.retries
    this.retryDelay = config.retryDelay
  }

  /**
   * Create a successful API response
   */
  public createSuccessResponse<T>(data: T, message?: string): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)
  }

  /**
   * Create an error response
   */
  protected createErrorResponse(error: APIError | Error): NextResponse {
    const apiError = toAPIError(error)

    const response = {
      ...apiError.toJSON(),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: apiError.statusCode })
  }

  /**
   * Create a paginated response
   */
  public createPaginatedResponse<T>(
    items: T[],
    pagination: PaginationParams,
    total: number
  ): NextResponse {
    const limit = pagination.limit || 20
    const page = pagination.page || 1
    const totalPages = Math.ceil(total / limit)

    const paginatedData: PaginatedResponse<T> = {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    }

    return this.createSuccessResponse(paginatedData)
  }

  /**
   * Handle async request execution with error handling
   */
  protected async handleRequest<T>(
    operation: () => Promise<T>
  ): Promise<NextResponse> {
    try {
      const result = await operation()
      return this.createSuccessResponse(result)
    } catch (error) {
      console.error('Service error:', error)
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * Execute operation with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.retries,
    delay: number = this.retryDelay
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx)
        if (error instanceof APIError && error.statusCode < 500) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error
        }

        // Wait before retrying
        await this.sleep(delay * Math.pow(2, attempt)) // Exponential backoff
      }
    }

    throw lastError!
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate UUID format
   */
  protected isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  /**
   * Extract user ID from authenticated request context
   */
  protected getUserId(context?: any): string {
    if (!context?.user?.id) {
      throw new APIError('User not authenticated', 401, 'UNAUTHORIZED')
    }
    return context.user.id
  }

  /**
   * Parse and validate pagination parameters
   */
  protected parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || undefined
    const order = searchParams.get('order') as 'asc' | 'desc' || 'desc'

    // Validate parameters
    if (page < 1) {
      throw new APIError('Page must be greater than 0', 400, 'INVALID_PAGE')
    }

    if (limit < 1 || limit > 100) {
      throw new APIError('Limit must be between 1 and 100', 400, 'INVALID_LIMIT')
    }

    if (order && !['asc', 'desc'].includes(order)) {
      throw new APIError('Order must be either "asc" or "desc"', 400, 'INVALID_ORDER')
    }

    return { page, limit, sort, order }
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    }

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  /**
   * Get client IP address from request
   */
  protected getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    )
  }

  /**
   * Get user agent from request
   */
  protected getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown'
  }

  /**
   * Generate a unique request ID
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(
    data: any,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(field => !data[field])

    if (missingFields.length > 0) {
      throw new APIError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        'MISSING_REQUIRED_FIELDS',
        { missing_fields: missingFields }
      )
    }
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  protected sanitizeObject(
    obj: any,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'apiKey']
  ): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }

    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key], sensitiveFields)
      }
    }

    return sanitized
  }

  /**
   * Calculate pagination offset
   */
  protected getOffset(page: number, limit: number): number {
    return (page - 1) * limit
  }

  /**
   * Format date for API responses
   */
  protected formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString()
    }
    return date.toISOString()
  }

  /**
   * Check if a string is a valid JSON
   */
  protected isValidJSON(str: string): boolean {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  /**
   * Transform snake_case to camelCase
   */
  protected toCamelCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.toCamelCase(item))
    }

    const result: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = this.toCamelCase(obj[key])
      }
    }

    return result
  }

  /**
   * Transform camelCase to snake_case
   */
  protected toSnakeCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.toSnakeCase(item))
    }

    const result: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        result[snakeKey] = this.toSnakeCase(obj[key])
      }
    }

    return result
  }

  /**
   * Truncate string to specified length
   */
  protected truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str
    }
    return str.substring(0, maxLength) + '...'
  }

  /**
   * Generate a slug from a string
   */
  protected generateSlug(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .trim()
  }

  /**
   * Check if a value is empty (null, undefined, empty string, empty array, empty object)
   */
  protected isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true
    }

    if (typeof value === 'string') {
      return value.trim() === ''
    }

    if (Array.isArray(value)) {
      return value.length === 0
    }

    if (typeof value === 'object') {
      return Object.keys(value).length === 0
    }

    return false
  }

  /**
   * Deep merge two objects
   */
  protected deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key])
        } else {
          result[key] = source[key]
        }
      }
    }

    return result
  }
}