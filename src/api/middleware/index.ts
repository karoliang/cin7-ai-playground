// API middleware exports

export {
  authMiddleware,
  withAuth,
  withOptionalAuth,
  withPermission,
  addCorsHeaders,
  handleCors
} from './auth'

export type {
  AuthenticatedRequest,
  AuthContext
} from './auth'

export {
  withValidation,
  withMultiValidation,
  validateSchema
} from './validation'

export type {
  ValidationResult
} from './validation'

export {
  withRateLimit,
  withAuthRateLimit,
  withAIRateLimit,
  withFileUploadRateLimit,
  withSearchRateLimit,
  withTieredRateLimit,
  withActionRateLimit,
  withSlidingWindowRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  cleanupRateLimits,
  DEFAULT_RATE_LIMITS
} from './rateLimiting'

export type {
  RateLimitConfig,
  RateLimitResult
} from './rateLimiting'

export {
  withLogging,
  withPerformanceLogging,
  withSecurityLogging,
  withAuditLogging,
  createStructuredLogger
} from './logging'

export type {
  StructuredLogger,
  LogContext,
  LogEntry,
  LoggingConfig
} from './logging'

// Composite middleware that combines common functionality
export { withAPI } from './composite'