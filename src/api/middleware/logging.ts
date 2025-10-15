// Logging middleware for API requests and responses

import { NextRequest, NextResponse } from 'next/server'

export interface LogContext {
  requestId: string
  method: string
  url: string
  userAgent?: string
  ip: string
  userId?: string
  startTime: number
  duration?: number
  statusCode?: number
  responseSize?: number
  error?: string
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context: LogContext
  additional?: Record<string, any>
}

export interface LoggingConfig {
  enabled: boolean
  level: 'info' | 'warn' | 'error' | 'debug'
  logRequestBody: boolean
  logResponseBody: boolean
  sanitizeHeaders: boolean
  excludePaths: string[]
  customLogger?: (entry: LogEntry) => void
  maxRequestBodySize: number
  maxResponseBodySize: number
}

// Default logging configuration
const DEFAULT_CONFIG: LoggingConfig = {
  enabled: process.env.NODE_ENV !== 'test',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  logRequestBody: false,
  logResponseBody: false,
  sanitizeHeaders: true,
  excludePaths: ['/health', '/metrics'],
  maxRequestBodySize: 1024, // 1KB
  maxResponseBodySize: 1024 // 1KB
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {}
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']

  for (const [key, value] of headers.entries()) {
    if (!sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = value
    } else {
      sanitized[key] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Truncate large strings for logging
 */
function truncateString(str: string, maxSize: number): string {
  if (str.length <= maxSize) {
    return str
  }
  return str.substring(0, maxSize) + `... [truncated, total: ${str.length} bytes]`
}

/**
 * Extract request body for logging
 */
async function extractRequestBody(request: NextRequest, maxSize: number): Promise<any> {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      return '[non-json body]'
    }

    const body = await request.text()
    if (!body) {
      return null
    }

    if (body.length > maxSize) {
      return truncateString(body, maxSize)
    }

    try {
      return JSON.parse(body)
    } catch {
      return truncateString(body, maxSize)
    }
  } catch (error) {
    return '[error reading body]'
  }
}

/**
 * Extract response data for logging
 */
function extractResponseData(response: NextResponse, maxSize: number): any {
  try {
    const responseText = response.body?.toString() || ''

    if (responseText.length > maxSize) {
      return truncateString(responseText, maxSize)
    }

    try {
      return JSON.parse(responseText)
    } catch {
      return responseText || '[empty response]'
    }
  } catch (error) {
    return '[error reading response]'
  }
}

/**
 * Create logger function
 */
function createLogger(config: LoggingConfig) {
  return (entry: LogEntry) => {
    if (!config.enabled) {
      return
    }

    const logLevel = entry.level
    const configLevel = config.level

    // Check if we should log this level
    const levels = ['debug', 'info', 'warn', 'error']
    if (levels.indexOf(logLevel) < levels.indexOf(configLevel)) {
      return
    }

    const logMessage = `[${entry.timestamp}] ${logLevel.toUpperCase()}: ${entry.message}`
    const logData = {
      ...entry.context,
      ...entry.additional
    }

    // Use custom logger if provided
    if (config.customLogger) {
      config.customLogger(entry)
      return
    }

    // Default console logging
    switch (logLevel) {
      case 'debug':
        console.debug(logMessage, logData)
        break
      case 'info':
        console.info(logMessage, logData)
        break
      case 'warn':
        console.warn(logMessage, logData)
        break
      case 'error':
        console.error(logMessage, logData)
        break
    }
  }
}

/**
 * Logging middleware
 */
export function withLogging(config: Partial<LoggingConfig> = {}) {
  const finalConfig: LoggingConfig = { ...DEFAULT_CONFIG, ...config }
  const logger = createLogger(finalConfig)

  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const startTime = Date.now()
      const requestId = generateRequestId()
      const url = new URL(request.url)

      // Check if path should be excluded from logging
      if (finalConfig.excludePaths.some(path => url.pathname.startsWith(path))) {
        return handler(request, context)
      }

      // Create initial log context
      const logContext: LogContext = {
        requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: getClientIP(request),
        userId: context?.user?.id,
        startTime
      }

      // Extract request data if enabled
      let requestBody: any
      if (finalConfig.logRequestBody) {
        requestBody = await extractRequestBody(request.clone(), finalConfig.maxRequestBodySize)
      }

      // Log request
      logger({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Incoming ${request.method} request to ${url.pathname}`,
        context: logContext,
        additional: {
          headers: finalConfig.sanitizeHeaders ? sanitizeHeaders(request.headers) : Object.fromEntries(request.headers.entries()),
          body: requestBody,
          query: Object.fromEntries(url.searchParams.entries())
        }
      })

      try {
        // Execute the handler
        const response = await handler(request, context)

        // Update log context with response data
        const endTime = Date.now()
        logContext.duration = endTime - logContext.startTime
        logContext.statusCode = response.status

        // Extract response data if enabled
        let responseBody: any
        if (finalConfig.logResponseBody) {
          responseBody = extractResponseData(response.clone(), finalConfig.maxResponseBodySize)
        }

        // Determine log level based on status code
        let logLevel: 'info' | 'warn' | 'error' = 'info'
        if (response.status >= 500) {
          logLevel = 'error'
        } else if (response.status >= 400) {
          logLevel = 'warn'
        }

        // Log response
        logger({
          timestamp: new Date().toISOString(),
          level: logLevel,
          message: `Completed ${request.method} request to ${url.pathname} with ${response.status}`,
          context: logContext,
          additional: {
            responseHeaders: Object.fromEntries(response.headers.entries()),
            body: responseBody
          }
        })

        // Add request ID to response headers for debugging
        response.headers.set('X-Request-ID', requestId)

        return response
      } catch (error) {
        // Update log context with error information
        const endTime = Date.now()
        logContext.duration = endTime - logContext.startTime
        logContext.error = error instanceof Error ? error.message : 'Unknown error'

        // Log error
        logger({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Error in ${request.method} request to ${url.pathname}`,
          context: logContext,
          additional: {
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : error
          }
        })

        // Re-throw the error
        throw error
      }
    }
  }
}

/**
 * Performance logging middleware
 */
export function withPerformanceLogging(config: {
  slowRequestThreshold?: number
  logQueries?: boolean
} = {}) {
  const { slowRequestThreshold = 1000, logQueries = false } = config

  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const startTime = performance.now()
      const startMemory = process.memoryUsage()

      try {
        const response = await handler(request, context)
        const endTime = performance.now()
        const endMemory = process.memoryUsage()
        const duration = endTime - startTime

        // Log slow requests
        if (duration > slowRequestThreshold) {
          console.warn('Slow request detected', {
            method: request.method,
            url: request.url,
            duration: Math.round(duration),
            memoryDelta: {
              rss: endMemory.rss - startMemory.rss,
              heapUsed: endMemory.heapUsed - startMemory.heapUsed
            }
          })
        }

        // Add performance headers
        response.headers.set('X-Response-Time', `${Math.round(duration)}ms`)
        response.headers.set('X-Memory-Usage', JSON.stringify({
          rss: endMemory.rss,
          heapUsed: endMemory.heapUsed,
          heapTotal: endMemory.heapTotal
        }))

        return response
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime

        console.error('Request failed', {
          method: request.method,
          url: request.url,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    }
  }
}

/**
 * Security logging middleware
 */
export function withSecurityLogging(config: {
  logSuspiciousActivity?: boolean
  suspiciousPatterns?: RegExp[]
} = {}) {
  const { logSuspiciousActivity = true, suspiciousPatterns = [] } = config

  const defaultSuspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /union.*select/i,  // SQL injection attempt
    /javascript:/i,  // JavaScript protocol
    /data:.*base64/i  // Base64 data URI
  ]

  const patterns = [...defaultSuspiciousPatterns, ...suspiciousPatterns]

  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const url = new URL(request.url)
      const userAgent = request.headers.get('user-agent') || ''
      const suspicious: string[] = []

      // Check for suspicious patterns in URL
      for (const pattern of patterns) {
        if (pattern.test(url.pathname + url.search)) {
          suspicious.push(`Suspicious pattern in URL: ${pattern.source}`)
        }
      }

      // Check for suspicious user agents
      const suspiciousUserAgents = [
        /bot/i,
        /crawler/i,
        /scanner/i,
        /sqlmap/i,
        /nikto/i
      ]

      for (const pattern of suspiciousUserAgents) {
        if (pattern.test(userAgent)) {
          suspicious.push(`Suspicious user agent: ${pattern.source}`)
        }
      }

      // Log suspicious activity
      if (logSuspiciousActivity && suspicious.length > 0) {
        console.warn('Suspicious activity detected', {
          ip: getClientIP(request),
          userAgent,
          url: request.url,
          userId: context?.user?.id,
          suspicious,
          headers: sanitizeHeaders(request.headers)
        })
      }

      return handler(request, context)
    }
  }
}

/**
 * Audit logging middleware
 */
export function withAuditLogging(config: {
  auditActions?: string[]
  sensitiveFields?: string[]
} = {}) {
  const { auditActions = [], sensitiveFields = ['password', 'token', 'secret', 'key'] } = config

  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const startTime = Date.now()
      const url = new URL(request.url)

      try {
        const response = await handler(request, context)

        // Check if this is an auditable action
        const isAuditable = auditActions.length === 0 ||
          auditActions.some(action => url.pathname.includes(action))

        if (isAuditable) {
          // Get request body for audit
          let body: any = {}
          try {
            const contentType = request.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const bodyText = await request.clone().text()
              body = JSON.parse(bodyText)

              // Remove sensitive fields
              for (const field of sensitiveFields) {
                if (body[field]) {
                  body[field] = '[REDACTED]'
                }
              }
            }
          } catch {
            // Ignore body parsing errors for audit
          }

          // Log audit entry
          console.info('Audit log entry', {
            timestamp: new Date().toISOString(),
            action: `${request.method} ${url.pathname}`,
            userId: context?.user?.id,
            ip: getClientIP(request),
            userAgent: request.headers.get('user-agent'),
            requestBody: body,
            statusCode: response.status,
            duration: Date.now() - startTime,
            requestId: response.headers.get('X-Request-ID')
          })
        }

        return response
      } catch (error) {
        // Log failed actions as well
        if (auditActions.length === 0 ||
          auditActions.some(action => url.pathname.includes(action))) {

          console.info('Audit log entry (failed)', {
            timestamp: new Date().toISOString(),
            action: `${request.method} ${url.pathname}`,
            userId: context?.user?.id,
            ip: getClientIP(request),
            userAgent: request.headers.get('user-agent'),
            statusCode: 500,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          })
        }

        throw error
      }
    }
  }
}

/**
 * Structured logging utility
 */
export class StructuredLogger {
  constructor(private config: LoggingConfig) {}

  info(message: string, context: Record<string, any> = {}) {
    this.log('info', message, context)
  }

  warn(message: string, context: Record<string, any> = {}) {
    this.log('warn', message, context)
  }

  error(message: string, context: Record<string, any> = {}) {
    this.log('error', message, context)
  }

  debug(message: string, context: Record<string, any> = {}) {
    this.log('debug', message, context)
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context as LogContext,
      additional: context
    }

    const logger = createLogger(this.config)
    logger(entry)
  }
}

/**
 * Create a structured logger instance
 */
export function createStructuredLogger(config: Partial<LoggingConfig> = {}): StructuredLogger {
  return new StructuredLogger({ ...DEFAULT_CONFIG, ...config })
}