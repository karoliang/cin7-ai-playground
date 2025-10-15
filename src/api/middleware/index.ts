// API middleware exports

export {
  authMiddleware,
  withAuth,
  withOptionalAuth,
  withPermission,
  AuthenticatedRequest,
  AuthContext,
  addCorsHeaders,
  handleCors
} from './auth'

export {
  withValidation,
  withMultiValidation,
  validateSchema,
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
  RateLimitConfig,
  RateLimitResult,
  DEFAULT_RATE_LIMITS
} from './rateLimiting'

export {
  withLogging,
  withPerformanceLogging,
  withSecurityLogging,
  withAuditLogging,
  createStructuredLogger,
  StructuredLogger,
  LogContext,
  LogEntry,
  LoggingConfig
} from './logging'

// Composite middleware that combines common functionality
export { withAPI } from './composite'