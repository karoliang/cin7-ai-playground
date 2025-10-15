/**
 * Authentication and Authorization Middleware
 * Provides comprehensive security for AI Gateway endpoints
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { EnvironmentSecurity, ServerEnvironmentConfig } from './envConfig'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    domain: string
    role: string
    permissions: string[]
  }
  sessionId?: string
}

export interface AuthOptions {
  required?: boolean
  permissions?: string[]
  domains?: string[]
  rateLimitKey?: string
}

/**
 * Authentication middleware for AI Gateway
 */
export class AuthMiddleware {
  private static readonly JWT_ALGORITHM = 'HS256'
  private static readonly TOKEN_PREFIX = 'Bearer '
  private static readonly SESSION_COOKIE_NAME = 'ai-gateway-session'

  /**
   * Main authentication middleware
   */
  static authenticate(options: AuthOptions = {}) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authResult = await this.performAuthentication(req, options)

        if (!authResult.success) {
          if (options.required !== false) {
            return this.sendAuthError(res, authResult.error!)
          }
          // Optional auth - continue without user context
          return next()
        }

        // Attach user context to request
        req.user = authResult.user!
        req.sessionId = authResult.sessionId

        // Validate domain restrictions
        if (options.domains && options.domains.length > 0) {
          if (!req.user.domain || !options.domains.includes(req.user.domain)) {
            return this.sendAuthError(res, 'Access denied: Domain not authorized', 403)
          }
        }

        // Validate permissions
        if (options.permissions && options.permissions.length > 0) {
          const hasPermission = options.permissions.some(permission =>
            req.user!.permissions.includes(permission)
          )

          if (!hasPermission) {
            return this.sendAuthError(res, 'Access denied: Insufficient permissions', 403)
          }
        }

        // Log successful authentication
        this.logAuthEvent(req, 'AUTH_SUCCESS')

        next()
      } catch (error) {
        console.error('[Auth] Authentication error:', error)
        return this.sendAuthError(res, 'Authentication service error', 500)
      }
    }
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(options: { windowMs: number; max: number; keyGenerator?: (req: AuthenticatedRequest) => string }) {
    const requests = new Map<string, { count: number; resetTime: number }>()

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const key = options.keyGenerator ? options.keyGenerator(req) : this.getDefaultRateLimitKey(req)
      const now = Date.now()

      // Clean up expired entries
      for (const [k, v] of requests.entries()) {
        if (now > v.resetTime) {
          requests.delete(k)
        }
      }

      // Check current usage
      const current = requests.get(key)
      if (current && current.count >= options.max) {
        const resetIn = Math.ceil((current.resetTime - now) / 1000)
        res.set({
          'X-RateLimit-Limit': options.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString(),
          'Retry-After': resetIn.toString()
        })
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: resetIn
        })
      }

      // Record request
      if (current) {
        current.count++
      } else {
        requests.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        })
      }

      // Set rate limit headers
      const remaining = options.max - (requests.get(key)?.count || 0)
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': requests.get(key)!.resetTime.toString()
      })

      next()
    }
  }

  /**
   * Input validation middleware
   */
  static validateInput(schema: any) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { error } = schema.validate(req.body)
        if (error) {
          return res.status(400).json({
            error: 'Invalid input',
            details: error.details.map((d: any) => ({
              field: d.path.join('.'),
              message: d.message
            }))
          })
        }
        next()
      } catch (error) {
        console.error('[Auth] Input validation error:', error)
        return res.status(500).json({ error: 'Validation service error' })
      }
    }
  }

  /**
   * Security headers middleware
   */
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Prevent clickjacking
      res.set('X-Frame-Options', 'DENY')

      // Prevent MIME type sniffing
      res.set('X-Content-Type-Options', 'nosniff')

      // Enable XSS protection
      res.set('X-XSS-Protection', '1; mode=block')

      // Force HTTPS in production
      if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      }

      // Content Security Policy
      res.set('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.openai.com https://open.bigmodel.cn",
        "frame-ancestors 'none'",
        "base-uri 'self'"
      ].join('; '))

      // Referrer policy
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      // Permissions policy
      res.set('Permissions-Policy', [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
      ].join(', '))

      next()
    }
  }

  /**
   * Domain restriction middleware
   */
  static restrictDomain(allowedDomains: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const userDomain = req.user?.domain
      if (!userDomain) {
        return this.sendAuthError(res, 'Access denied: Domain not specified', 403)
      }

      if (!allowedDomains.includes(userDomain)) {
        return this.sendAuthError(res, 'Access denied: Domain not authorized', 403)
      }

      next()
    }
  }

  // Private methods

  private static async performAuthentication(
    req: AuthenticatedRequest,
    options: AuthOptions
  ): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
    // Try JWT token from Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith(this.TOKEN_PREFIX)) {
      const token = authHeader.substring(this.TOKEN_PREFIX.length)
      return this.validateJWTToken(token)
    }

    // Try session cookie
    const sessionCookie = req.cookies?.[this.SESSION_COOKIE_NAME]
    if (sessionCookie) {
      return this.validateSessionToken(sessionCookie)
    }

    // Try API key from header (for service-to-service communication)
    const apiKey = req.headers['x-api-key'] as string
    if (apiKey) {
      return this.validateAPIKey(apiKey)
    }

    return { success: false, error: 'No authentication credentials provided' }
  }

  private static async validateJWTToken(token: string): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
    try {
      const config = ServerEnvironmentConfig.get()
      const decoded = jwt.verify(token, config.security.jwtSecret, {
        algorithms: [this.JWT_ALGORITHM]
      }) as any

      // Validate token structure
      if (!decoded.id || !decoded.email || !decoded.domain) {
        return { success: false, error: 'Invalid token structure' }
      }

      // Check if token is expired
      if (decoded.exp && Date.now() > decoded.exp * 1000) {
        return { success: false, error: 'Token expired' }
      }

      return {
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          domain: decoded.domain,
          role: decoded.role || 'user',
          permissions: decoded.permissions || ['read']
        },
        sessionId: decoded.sessionId
      }
    } catch (error) {
      console.error('[Auth] JWT validation error:', error)
      return { success: false, error: 'Invalid token' }
    }
  }

  private static async validateSessionToken(sessionToken: string): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
    // In a real implementation, you would validate against a session store
    // For now, treat it as a JWT token
    return this.validateJWTToken(sessionToken)
  }

  private static async validateAPIKey(apiKey: string): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
    // In a real implementation, you would validate against a database
    // For service-to-service communication, create a service user
    if (apiKey === process.env.SERVICE_API_KEY) {
      return {
        success: true,
        user: {
          id: 'service',
          email: 'service@cin7.com',
          domain: 'cin7.com',
          role: 'service',
          permissions: ['read', 'write', 'admin']
        },
        sessionId: 'service-session'
      }
    }

    return { success: false, error: 'Invalid API key' }
  }

  private static getDefaultRateLimitKey(req: AuthenticatedRequest): string {
    if (req.user) {
      return `user:${req.user.id}`
    }
    if (req.ip) {
      return `ip:${req.ip}`
    }
    return 'anonymous'
  }

  private static sendAuthError(res: Response, message: string, status: number = 401): void {
    res.status(status).json({
      error: message,
      code: 'AUTH_ERROR',
      timestamp: Date.now()
    })
  }

  private static logAuthEvent(req: AuthenticatedRequest, event: string): void {
    const logData = {
      event,
      timestamp: Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      domain: req.user?.domain,
      sessionId: req.sessionId
    }

    console.log('[Auth]', logData)

    // In a real implementation, you would send this to a secure audit log
  }
}

/**
 * Predefined authentication middlewares for common use cases
 */
export const requireAuth = AuthMiddleware.authenticate({ required: true })
export const optionalAuth = AuthMiddleware.authenticate({ required: false })
export const requireCin7Domain = AuthMiddleware.authenticate({
  required: true,
  domains: ['cin7.com']
})
export const requireAdmin = AuthMiddleware.authenticate({
  required: true,
  permissions: ['admin']
})
export const rateLimitStrict = AuthMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // 50 requests per window
})
export const rateLimitLoose = AuthMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // 200 requests per window
})