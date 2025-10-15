// Rate limiting middleware for API requests

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis' // or your preferred Redis client
import { AuthContext } from './auth'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest, context?: AuthContext) => string
  onLimitReached?: (request: NextRequest, retryAfter: number) => void
}

export interface RateLimitResult {
  success: boolean
  limit: number
  current: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

// Default configurations for different endpoint types
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Limit auth attempts
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // Limit AI requests
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },
  file_upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Limit file uploads
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // Limit search requests
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
}

/**
 * In-memory rate limiter for development/testing
 */
class MemoryRateLimiter {
  private storage = new Map<string, { count: number; resetTime: number }>()

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up expired entries
    for (const [k, v] of this.storage.entries()) {
      if (v.resetTime < now) {
        this.storage.delete(k)
      }
    }

    const existing = this.storage.get(key)
    const resetTime = now + config.windowMs

    if (existing && existing.resetTime > now) {
      // Update existing counter
      existing.count += 1
      existing.resetTime = resetTime

      const remaining = Math.max(0, config.maxRequests - existing.count)
      const success = existing.count <= config.maxRequests

      return {
        success,
        limit: config.maxRequests,
        current: existing.count,
        remaining,
        resetTime: new Date(resetTime),
        retryAfter: success ? undefined : Math.ceil(config.windowMs / 1000)
      }
    } else {
      // Create new entry
      const count = 1
      this.storage.set(key, { count, resetTime })

      return {
        success: true,
        limit: config.maxRequests,
        current: count,
        remaining: config.maxRequests - count,
        resetTime: new Date(resetTime)
      }
    }
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [k, v] of this.storage.entries()) {
      if (v.resetTime < now) {
        this.storage.delete(k)
      }
    }
  }
}

/**
 * Redis-based rate limiter for production
 */
class RedisRateLimiter {
  constructor(private redis: Redis) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const resetTime = now + config.windowMs

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline()

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Count current requests
    pipeline.zcard(key)

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`)

    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))

    const results = await pipeline.exec()
    const count = (results?.[1]?.[1] as number) || 0

    const remaining = Math.max(0, config.maxRequests - count)
    const success = count <= config.maxRequests

    return {
      success,
      limit: config.maxRequests,
      current: count,
      remaining,
      resetTime: new Date(resetTime),
      retryAfter: success ? undefined : Math.ceil(config.windowMs / 1000)
    }
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async cleanup(): Promise<void> {
    // Redis handles expiration automatically
  }
}

/**
 * Get rate limiter instance based on environment
 */
function getRateLimiter(): MemoryRateLimiter | RedisRateLimiter {
  // Check if Redis is available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    return new RedisRateLimiter(redis)
  }

  // Fall back to memory-based limiter
  return new MemoryRateLimiter()
}

const rateLimiter = getRateLimiter()

/**
 * Generate rate limit key based on request and context
 */
function defaultKeyGenerator(request: NextRequest, context?: AuthContext): string {
  const ip = getClientIP(request)
  const userId = context?.user?.id || 'anonymous'
  const path = new URL(request.url).pathname
  return `rate_limit:${userId}:${ip}:${path}`
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
 * Rate limiting middleware
 */
export function withRateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig: RateLimitConfig = {
    ...DEFAULT_RATE_LIMITS.default,
    ...config,
    keyGenerator: config.keyGenerator || defaultKeyGenerator
  }

  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      try {
        // Generate rate limit key
        const key = finalConfig.keyGenerator!(request, context)

        // Check rate limit
        const result = await rateLimiter.check(key, finalConfig)

        // Add rate limit headers to response
        const addRateLimitHeaders = (response: NextResponse) => {
          response.headers.set('X-RateLimit-Limit', result.limit.toString())
          response.headers.set('X-RateLimit-Current', result.current.toString())
          response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
          response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString())

          if (result.retryAfter) {
            response.headers.set('Retry-After', result.retryAfter.toString())
          }
        }

        // Check if limit exceeded
        if (!result.success) {
          const response = NextResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMITED',
              details: {
                limit: result.limit,
                current: result.current,
                remaining: result.remaining,
                resetTime: result.resetTime.toISOString(),
                retryAfter: result.retryAfter
              },
              timestamp: new Date().toISOString()
            },
            { status: 429 }
          )

          addRateLimitHeaders(response)

          // Call custom handler if provided
          if (finalConfig.onLimitReached) {
            finalConfig.onLimitReached(request, result.retryAfter || 60)
          }

          return response
        }

        // Execute the handler
        const response = await handler(request, context)

        // Add rate limit headers to successful response
        addRateLimitHeaders(response)

        // Skip counting certain requests if configured
        const shouldSkip =
          (finalConfig.skipSuccessfulRequests && response.status < 400) ||
          (finalConfig.skipFailedRequests && response.status >= 400)

        if (shouldSkip) {
          // Decrement the count we just added
          await rateLimiter.check(key, { ...finalConfig, maxRequests: finalConfig.maxRequests + 1 })
        }

        return response
      } catch (error) {
        console.error('Rate limiting middleware error:', error)

        // Fail open - allow the request if rate limiting fails
        return handler(request, context)
      }
    }
  }
}

/**
 * Pre-configured rate limiters for different endpoint types
 */
export const withAuthRateLimit = () => withRateLimit(DEFAULT_RATE_LIMITS.auth)
export const withAIRateLimit = () => withRateLimit(DEFAULT_RATE_LIMITS.ai)
export const withFileUploadRateLimit = () => withRateLimit(DEFAULT_RATE_LIMITS.file_upload)
export const withSearchRateLimit = () => withRateLimit(DEFAULT_RATE_LIMITS.search)

/**
 * Custom rate limiter for specific user tiers
 */
export function withTieredRateLimit(tiers: {
  free?: Partial<RateLimitConfig>
  pro?: Partial<RateLimitConfig>
  enterprise?: Partial<RateLimitConfig>
}) {
  return (
    handler: (request: NextRequest, context?: AuthContext) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: AuthContext): Promise<NextResponse> => {
      // Determine user tier (this would come from your user service)
      const userTier = getUserTier(context?.user?.id)
      const tierConfig = tiers[userTier] || tiers.free || {}

      const config: RateLimitConfig = {
        ...DEFAULT_RATE_LIMITS.default,
        ...tierConfig,
        keyGenerator: (req, ctx) => {
          const baseKey = defaultKeyGenerator(req, ctx)
          return `${baseKey}:${userTier}`
        }
      }

      const limitedHandler = withRateLimit(config)(handler)
      return limitedHandler(request, context)
    }
  }
}

/**
 * Get user tier (placeholder implementation)
 */
function getUserTier(userId?: string): 'free' | 'pro' | 'enterprise' {
  // This would typically come from your user database
  // For now, return 'free' for all users
  return 'free'
}

/**
 * Rate limiter for specific actions (e.g., password reset, email verification)
 */
export function withActionRateLimit(
  action: string,
  config: Partial<RateLimitConfig> = {}
) {
  return withRateLimit({
    ...config,
    keyGenerator: (request, context) => {
      const userId = context?.user?.id || getClientIP(request)
      return `action_rate_limit:${action}:${userId}`
    }
  })
}

/**
 * Rate limiter that tracks multiple windows
 */
export function withSlidingWindowRateLimit(config: {
  windows: Array<{
    duration: number // in milliseconds
    maxRequests: number
  }>
}) {
  return (
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const key = defaultKeyGenerator(request, context)
      const now = Date.now()

      // Check each window
      for (const window of config.windows) {
        const windowConfig: RateLimitConfig = {
          windowMs: window.duration,
          maxRequests: window.maxRequests,
          keyGenerator: () => `${key}:${window.duration}`
        }

        const result = await rateLimiter.check(key, windowConfig)

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMITED',
              details: {
                window: window.duration,
                limit: window.maxRequests,
                current: result.current,
                retryAfter: result.retryAfter
              },
              timestamp: new Date().toISOString()
            },
            { status: 429 }
          )
        }
      }

      return handler(request, context)
    }
  }
}

/**
 * Reset rate limit for a specific user/key
 */
export async function resetRateLimit(key: string): Promise<void> {
  await rateLimiter.reset(key)
}

/**
 * Get current rate limit status for a user/key
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimiter.check(key, config)
}

/**
 * Cleanup expired rate limit entries
 */
export async function cleanupRateLimits(): Promise<void> {
  await rateLimiter.cleanup()
}