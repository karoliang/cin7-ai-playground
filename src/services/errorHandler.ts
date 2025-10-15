import {
  AIGatewayError,
  ErrorCode
} from '@/types/aiGateway'

/**
 * Comprehensive Error Handling Service for AI Gateway
 * Provides centralized error management, classification, and recovery strategies
 */
export class ErrorHandlerService {
  private errorHandlers = new Map<ErrorCode, ErrorHandler>()
  private errorHistory: ErrorRecord[] = []
  private maxHistorySize = 1000
  private config: ErrorHandlerConfig

  constructor(config: ErrorHandlerConfig) {
    this.config = config
    this.initializeDefaultHandlers()
  }

  /**
   * Handle an error with appropriate strategy
   */
  async handleError(error: any, context?: ErrorContext): Promise<ErrorHandlingResult> {
    const gatewayError = this.normalizeError(error)
    const handler = this.getErrorHandler(gatewayError.code)

    // Record error
    this.recordError(gatewayError, context)

    // Execute error handling strategy
    try {
      const result = await handler.handle(gatewayError, context)

      // Log error handling result
      this.logErrorHandling(gatewayError, context, result)

      return result
    } catch (handlingError) {
      // Fallback handling if the handler itself fails
      return this.createFallbackResult(gatewayError, handlingError)
    }
  }

  /**
   * Create a typed error
   */
  createError(code: ErrorCode, message: string, details?: any): AIGatewayError {
    return {
      code,
      message,
      details,
      timestamp: Date.now()
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AIGatewayError): boolean {
    const handler = this.getErrorHandler(error.code)
    return handler.isRetryable(error)
  }

  /**
   * Get retry delay for an error
   */
  getRetryDelay(error: AIGatewayError, attempt: number): number {
    const handler = this.getErrorHandler(error.code)
    return handler.getRetryDelay(error, attempt)
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: AIGatewayError): string {
    const handler = this.getErrorHandler(error.code)
    return handler.getUserMessage(error)
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: this.errorHistory.length,
      errorsByCode: {},
      errorsByProvider: {},
      recentErrors: this.errorHistory.slice(-10),
      errorRate: this.calculateErrorRate(),
      topErrors: this.getTopErrors()
    }

    // Calculate errors by code
    for (const record of this.errorHistory) {
      stats.errorsByCode[record.error.code] = (stats.errorsByCode[record.error.code] || 0) + 1
    }

    // Calculate errors by provider
    for (const record of this.errorHistory) {
      if (record.error.provider) {
        stats.errorsByProvider[record.error.provider] = (stats.errorsByProvider[record.error.provider] || 0) + 1
      }
    }

    return stats
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * Register custom error handler
   */
  registerHandler(code: ErrorCode, handler: ErrorHandler): void {
    this.errorHandlers.set(code, handler)
  }

  /**
   * Normalize error to AIGatewayError format
   */
  private normalizeError(error: any): AIGatewayError {
    if (this.isAIGatewayError(error)) {
      return error
    }

    if (error instanceof Error) {
      return this.classifyError(error)
    }

    if (typeof error === 'string') {
      return {
        code: 'INTERNAL_ERROR',
        message: error,
        timestamp: Date.now()
      }
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'Unknown error occurred',
      details: { originalError: error },
      timestamp: Date.now()
    }
  }

  /**
   * Check if error is already an AIGatewayError
   */
  private isAIGatewayError(error: any): error is AIGatewayError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error && 'timestamp' in error
  }

  /**
   * Classify generic error into AIGatewayError
   */
  private classifyError(error: Error): AIGatewayError {
    const message = error.message.toLowerCase()
    const name = error.constructor.name

    // Network errors
    if (message.includes('network') || message.includes('fetch') || name === 'NetworkError') {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Timeout errors
    if (message.includes('timeout') || name === 'TimeoutError') {
      return {
        code: 'TIMEOUT',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('authentication')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Permission errors
    if (message.includes('forbidden') || message.includes('403') || message.includes('permission')) {
      return {
        code: 'PERMISSION_DENIED',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Quota errors
    if (message.includes('quota') || message.includes('limit') || message.includes('exceeded')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('400')) {
      return {
        code: 'INVALID_REQUEST',
        message: error.message,
        timestamp: Date.now()
      }
    }

    // Default internal error
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: Date.now()
    }
  }

  /**
   * Get error handler for error code
   */
  private getErrorHandler(code: ErrorCode): ErrorHandler {
    return this.errorHandlers.get(code) || this.defaultHandler
  }

  /**
   * Record error in history
   */
  private recordError(error: AIGatewayError, context?: ErrorContext): void {
    const record: ErrorRecord = {
      error,
      context: context || {},
      timestamp: Date.now()
    }

    this.errorHistory.push(record)

    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Log error handling
   */
  private logErrorHandling(error: AIGatewayError, context?: ErrorContext, result?: ErrorHandlingResult): void {
    const logLevel = this.getLogLevel(error)
    const message = `[${error.code}] ${error.message}`

    const logData = {
      error,
      context,
      result,
      handlingStrategy: result?.strategy,
      resolved: result?.resolved || false
    }

    switch (logLevel) {
      case 'error':
        console.error(message, logData)
        break
      case 'warn':
        console.warn(message, logData)
        break
      case 'info':
        console.info(message, logData)
        break
      default:
        console.log(message, logData)
    }
  }

  /**
   * Get log level for error
   */
  private getLogLevel(error: AIGatewayError): 'error' | 'warn' | 'info' | 'debug' {
    const criticalErrors = [
      'INTERNAL_ERROR',
      'AUTHENTICATION_ERROR',
      'PERMISSION_DENIED'
    ]

    const warningErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TIMEOUT',
      'NETWORK_ERROR'
    ]

    if (criticalErrors.includes(error.code)) {
      return 'error'
    } else if (warningErrors.includes(error.code)) {
      return 'warn'
    } else {
      return 'info'
    }
  }

  /**
   * Create fallback error handling result
   */
  private createFallbackResult(error: AIGatewayError, handlingError: any): ErrorHandlingResult {
    return {
      strategy: 'fallback',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'An unexpected error occurred. Please try again later.',
      technicalDetails: {
        originalError: error,
        handlingError: handlingError.message || handlingError
      }
    }
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.errorHistory.length === 0) {
      return 0
    }

    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentErrors = this.errorHistory.filter(record => record.timestamp > oneHourAgo)

    // This is a simplified calculation - in practice, you'd compare against total requests
    return recentErrors.length
  }

  /**
   * Get top errors
   */
  private getTopErrors(): Array<{ code: ErrorCode; count: number; message: string }> {
    const errorCounts = new Map<ErrorCode, { count: number; message: string }>()

    for (const record of this.errorHistory) {
      const existing = errorCounts.get(record.error.code)
      if (existing) {
        existing.count++
      } else {
        errorCounts.set(record.error.code, {
          count: 1,
          message: record.error.message
        })
      }
    }

    return Array.from(errorCounts.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  /**
   * Initialize default error handlers
   */
  private initializeDefaultHandlers(): void {
    // Network errors
    this.registerHandler('NETWORK_ERROR', new NetworkErrorHandler())

    // Timeout errors
    this.registerHandler('TIMEOUT', new TimeoutErrorHandler())

    // Rate limit errors
    this.registerHandler('RATE_LIMIT_EXCEEDED', new RateLimitErrorHandler())

    // Authentication errors
    this.registerHandler('AUTHENTICATION_ERROR', new AuthenticationErrorHandler())

    // Permission errors
    this.registerHandler('PERMISSION_DENIED', new PermissionErrorHandler())

    // Validation errors
    this.registerHandler('INVALID_REQUEST', new ValidationErrorHandler())

    // Provider errors
    this.registerHandler('PROVIDER_ERROR', new ProviderErrorHandler())

    // Quota errors
    this.registerHandler('QUOTA_EXCEEDED', new QuotaErrorHandler())

    // Model availability errors
    this.registerHandler('MODEL_NOT_AVAILABLE', new ModelNotAvailableErrorHandler())

    // Content filtered errors
    this.registerHandler('CONTENT_FILTERED', new ContentFilteredErrorHandler())

    // Default handler
    this.defaultHandler = new DefaultErrorHandler()
  }

  private defaultHandler: ErrorHandler
}

/**
 * Error Handler Interface
 */
export interface ErrorHandler {
  handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult>
  isRetryable(error: AIGatewayError): boolean
  getRetryDelay(error: AIGatewayError, attempt: number): number
  getUserMessage(error: AIGatewayError): string
}

/**
 * Error Handling Result
 */
export interface ErrorHandlingResult {
  strategy: string
  resolved: boolean
  retryable: boolean
  retryDelay: number
  userMessage: string
  technicalDetails?: any
  suggestedActions?: string[]
}

/**
 * Error Context
 */
export interface ErrorContext {
  requestId?: string
  provider?: string
  model?: string
  userId?: string
  attempt?: number
  operation?: string
  additionalData?: Record<string, any>
}

/**
 * Error Record
 */
interface ErrorRecord {
  error: AIGatewayError
  context: ErrorContext
  timestamp: number
}

/**
 * Error Statistics
 */
export interface ErrorStats {
  totalErrors: number
  errorsByCode: Record<ErrorCode, number>
  errorsByProvider: Record<string, number>
  recentErrors: ErrorRecord[]
  errorRate: number
  topErrors: Array<{ code: ErrorCode; count: number; message: string }>
}

/**
 * Error Handler Configuration
 */
export interface ErrorHandlerConfig {
  enableRetry: boolean
  maxRetries: number
  baseRetryDelay: number
  maxRetryDelay: number
  enableFallback: boolean
  logErrors: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Default Error Handler Implementations
 */
class DefaultErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'default',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'An unexpected error occurred. Please try again later.',
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'An unexpected error occurred. Please try again later.'
  }
}

class NetworkErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'network-error',
      resolved: false,
      retryable: true,
      retryDelay: this.getRetryDelay(error, context?.attempt || 1),
      userMessage: 'Network connection issue. Please check your internet connection and try again.',
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return true
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000)
  }

  getUserMessage(error: AIGatewayError): string {
    return 'Network connection issue. Please check your internet connection and try again.'
  }
}

class TimeoutErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'timeout',
      resolved: false,
      retryable: context?.attempt ? context.attempt < 3 : true,
      retryDelay: this.getRetryDelay(error, context?.attempt || 1),
      userMessage: 'The request timed out. Please try again.',
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return true
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    // Linear backoff: 2s, 4s, 6s
    return Math.min(2000 * attempt, 10000)
  }

  getUserMessage(error: AIGatewayError): string {
    return 'The request timed out. Please try again.'
  }
}

class RateLimitErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    const retryAfter = error.details?.retryAfter || 60

    return {
      strategy: 'rate-limit',
      resolved: false,
      retryable: true,
      retryDelay: retryAfter * 1000,
      userMessage: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
      suggestedActions: [
        'Wait for the rate limit to reset',
        'Reduce the frequency of requests',
        'Upgrade to a higher tier plan'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return true
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return (error.details?.retryAfter || 60) * 1000
  }

  getUserMessage(error: AIGatewayError): string {
    const retryAfter = error.details?.retryAfter || 60
    return `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
  }
}

class AuthenticationErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'authentication',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'Authentication failed. Please check your API key and try again.',
      suggestedActions: [
        'Verify your API key is correct',
        'Check if your API key has expired',
        'Ensure you have the necessary permissions'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'Authentication failed. Please check your API key and try again.'
  }
}

class PermissionErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'permission',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'You do not have permission to perform this action.',
      suggestedActions: [
        'Check your account permissions',
        'Contact your administrator',
        'Upgrade your plan if necessary'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'You do not have permission to perform this action.'
  }
}

class ValidationErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'validation',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'The request data is invalid. Please check your input and try again.',
      suggestedActions: [
        'Check the request format',
        'Verify all required fields are present',
        'Ensure data types are correct'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'The request data is invalid. Please check your input and try again.'
  }
}

class ProviderErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'provider-error',
      resolved: false,
      retryable: true,
      retryDelay: this.getRetryDelay(error, context?.attempt || 1),
      userMessage: 'The AI service is currently unavailable. Please try again later.',
      suggestedActions: [
        'Try again in a few moments',
        'Check if the service is having issues',
        'Contact support if the problem persists'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return true
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 2000 * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 1000
    return Math.min(baseDelay + jitter, 30000)
  }

  getUserMessage(error: AIGatewayError): string {
    return 'The AI service is currently unavailable. Please try again later.'
  }
}

class QuotaErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'quota',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'You have reached your usage quota. Please upgrade your plan or wait for the quota to reset.',
      suggestedActions: [
        'Upgrade to a higher tier plan',
        'Wait for the quota to reset (usually monthly)',
        'Reduce usage or optimize requests'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'You have reached your usage quota. Please upgrade your plan or wait for the quota to reset.'
  }
}

class ModelNotAvailableErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'model-availability',
      resolved: false,
      retryable: true,
      retryDelay: 5000, // 5 seconds
      userMessage: 'The requested AI model is currently unavailable. Please try again later or use a different model.',
      suggestedActions: [
        'Try again in a few moments',
        'Use a different model if available',
        'Check model availability status'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return true
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 5000
  }

  getUserMessage(error: AIGatewayError): string {
    return 'The requested AI model is currently unavailable. Please try again later or use a different model.'
  }
}

class ContentFilteredErrorHandler implements ErrorHandler {
  async handle(error: AIGatewayError, context?: ErrorContext): Promise<ErrorHandlingResult> {
    return {
      strategy: 'content-filter',
      resolved: false,
      retryable: false,
      retryDelay: 0,
      userMessage: 'Your request was blocked by the content filter. Please modify your request and try again.',
      suggestedActions: [
        'Review and modify your request content',
        'Remove potentially sensitive or inappropriate content',
        'Contact support if you believe this is an error'
      ],
      technicalDetails: { error, context }
    }
  }

  isRetryable(error: AIGatewayError): boolean {
    return false
  }

  getRetryDelay(error: AIGatewayError, attempt: number): number {
    return 0
  }

  getUserMessage(error: AIGatewayError): string {
    return 'Your request was blocked by the content filter. Please modify your request and try again.'
  }
}

// Default configuration
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  enableRetry: true,
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 30000,
  enableFallback: true,
  logErrors: true,
  logLevel: 'error'
}

// Export factory function
export function createErrorHandlerService(config: Partial<ErrorHandlerConfig> = {}): ErrorHandlerService {
  const finalConfig = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config }
  return new ErrorHandlerService(finalConfig)
}