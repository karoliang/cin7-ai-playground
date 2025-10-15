/**
 * Input Validation and Sanitization Security Module
 * Provides comprehensive input validation for AI Gateway requests
 */

import DOMPurify from 'dompurify'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export class InputValidator {
  private static readonly MAX_PROMPT_LENGTH = 50000
  private static readonly MAX_CONTEXT_SIZE = 1000000
  private static readonly BLOCKED_PATTERNS = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // Script injection patterns
    /(<script|javascript:|on\w+\s*=)/i,
    // Command injection patterns
    /(\$\(.*\)|`.*`|&&|\|\||;)/,
    // Path traversal patterns
    /(\.\.\/|\.\.\\)/,
    // NoSQL injection patterns
    /(\$where|\$ne|\$gt|\$lt|\$in)/i,
    // LDAP injection patterns
    /(\(\)|\*\)|\(\|)/,
    // XSS patterns
    /(<iframe|<object|<embed|<link|<meta)/i,
    // Prompt injection specific patterns
    /(ignore previous|override instructions|system prompt|jailbreak)/i
  ]

  private static readonly SUSPICIOUS_KEYWORDS = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'admin', 'root', 'sudo', 'privilege', 'escalate',
    'malicious', 'exploit', 'vulnerability', 'bypass'
  ]

  /**
   * Validate and sanitize AI request
   */
  static validateAIRequest(request: any): ValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Validate prompt
    if (request.prompt) {
      const promptValidation = this.validatePrompt(request.prompt)
      errors.push(...promptValidation.errors)
      riskLevel = this.calculateRiskLevel(riskLevel, promptValidation.riskLevel)
      request.prompt = promptValidation.sanitizedData
    }

    // Validate context
    if (request.context) {
      const contextValidation = this.validateContext(request.context)
      errors.push(...contextValidation.errors)
      riskLevel = this.calculateRiskLevel(riskLevel, contextValidation.riskLevel)
      request.context = contextValidation.sanitizedData
    }

    // Validate options
    if (request.options) {
      const optionsValidation = this.validateOptions(request.options)
      errors.push(...optionsValidation.errors)
      riskLevel = this.calculateRiskLevel(riskLevel, optionsValidation.riskLevel)
      request.options = optionsValidation.sanitizedData
    }

    // Validate chat history
    if (request.chat_history) {
      const historyValidation = this.validateChatHistory(request.chat_history)
      errors.push(...historyValidation.errors)
      riskLevel = this.calculateRiskLevel(riskLevel, historyValidation.riskLevel)
      request.chat_history = historyValidation.sanitizedData
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: request,
      riskLevel
    }
  }

  /**
   * Validate and sanitize prompt text
   */
  static validatePrompt(prompt: string): ValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    // Length validation
    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      errors.push(`Prompt exceeds maximum length of ${this.MAX_PROMPT_LENGTH} characters`)
      riskLevel = 'high'
    }

    // Check for blocked patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        errors.push('Prompt contains potentially malicious content')
        riskLevel = 'critical'
        break
      }
    }

    // Check for suspicious keywords
    const suspiciousFound = this.SUSPICIOUS_KEYWORDS.filter(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    )

    if (suspiciousFound.length > 0) {
      errors.push(`Prompt contains suspicious keywords: ${suspiciousFound.join(', ')}`)
      riskLevel = riskLevel === 'critical' ? 'critical' : 'medium'
    }

    // Check for repetitive content (potential DoS)
    if (this.hasExcessiveRepetition(prompt)) {
      errors.push('Prompt contains excessive repetitive content')
      riskLevel = 'medium'
    }

    // Sanitize prompt
    const sanitized = this.sanitizePrompt(prompt)

    return {
      isValid: riskLevel !== 'critical' && errors.length === 0,
      errors,
      sanitizedData: sanitized,
      riskLevel
    }
  }

  /**
   * Validate and sanitize context data
   */
  static validateContext(context: any): ValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    try {
      // Ensure context is an object
      if (typeof context !== 'object' || context === null) {
        errors.push('Context must be a valid object')
        return { isValid: false, errors, riskLevel: 'high' }
      }

      // Validate context size
      const contextSize = JSON.stringify(context).length
      if (contextSize > this.MAX_CONTEXT_SIZE) {
        errors.push(`Context exceeds maximum size of ${this.MAX_CONTEXT_SIZE} characters`)
        riskLevel = 'high'
      }

      // Sanitize context fields
      const sanitized: any = {}
      for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'string') {
          // Check for malicious content in string values
          const stringValidation = this.validatePrompt(value)
          if (stringValidation.riskLevel === 'critical') {
            errors.push(`Context field '${key}' contains malicious content`)
            riskLevel = 'critical'
          }
          sanitized[key] = stringValidation.sanitizedData
        } else if (typeof value === 'object' && value !== null) {
          // Recursively validate nested objects
          const nestedValidation = this.validateContext(value)
          errors.push(...nestedValidation.errors)
          sanitized[key] = nestedValidation.sanitizedData
        } else {
          sanitized[key] = value
        }
      }

      return {
        isValid: riskLevel !== 'critical' && errors.length === 0,
        errors,
        sanitizedData: sanitized,
        riskLevel
      }
    } catch (error) {
      errors.push('Failed to validate context data')
      return { isValid: false, errors, riskLevel: 'high' }
    }
  }

  /**
   * Validate and sanitize request options
   */
  static validateOptions(options: any): ValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    try {
      const sanitized: any = {}

      // Validate temperature
      if (options.temperature !== undefined) {
        if (typeof options.temperature !== 'number' ||
            options.temperature < 0 ||
            options.temperature > 2) {
          errors.push('Temperature must be a number between 0 and 2')
          riskLevel = 'medium'
        } else {
          sanitized.temperature = Math.max(0, Math.min(2, options.temperature))
        }
      }

      // Validate max_tokens
      if (options.max_tokens !== undefined) {
        if (typeof options.max_tokens !== 'number' ||
            options.max_tokens < 1 ||
            options.max_tokens > 100000) {
          errors.push('Max tokens must be a number between 1 and 100000')
          riskLevel = 'medium'
        } else {
          sanitized.max_tokens = Math.max(1, Math.min(100000, options.max_tokens))
        }
      }

      // Validate stream option
      if (options.stream !== undefined) {
        if (typeof options.stream !== 'boolean') {
          errors.push('Stream option must be a boolean')
          riskLevel = 'low'
        } else {
          sanitized.stream = options.stream
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized,
        riskLevel
      }
    } catch (error) {
      errors.push('Failed to validate options')
      return { isValid: false, errors, riskLevel: 'high' }
    }
  }

  /**
   * Validate and sanitize chat history
   */
  static validateChatHistory(history: any[]): ValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (!Array.isArray(history)) {
      errors.push('Chat history must be an array')
      return { isValid: false, errors, riskLevel: 'high' }
    }

    if (history.length > 100) {
      errors.push('Chat history cannot exceed 100 messages')
      riskLevel = 'medium'
    }

    const sanitized: any[] = []

    for (const [index, message] of history.entries()) {
      if (typeof message !== 'object' || message === null) {
        errors.push(`Chat history item ${index} must be an object`)
        riskLevel = 'medium'
        continue
      }

      // Validate role
      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        errors.push(`Chat history item ${index} has invalid role`)
        riskLevel = 'medium'
        continue
      }

      // Validate content
      if (!message.content || typeof message.content !== 'string') {
        errors.push(`Chat history item ${index} must have valid content`)
        riskLevel = 'medium'
        continue
      }

      // Validate content for malicious patterns
      const contentValidation = this.validatePrompt(message.content)
      if (contentValidation.riskLevel === 'critical') {
        errors.push(`Chat history item ${index} contains malicious content`)
        riskLevel = 'critical'
        continue
      }

      sanitized.push({
        role: message.role,
        content: contentValidation.sanitizedData
      })
    }

    return {
      isValid: riskLevel !== 'critical' && errors.length === 0,
      errors,
      sanitizedData: sanitized,
      riskLevel
    }
  }

  /**
   * Sanitize prompt text
   */
  private static sanitizePrompt(prompt: string): string {
    // Remove HTML tags
    let sanitized = DOMPurify.sanitize(prompt, { ALLOWED_TAGS: [] })

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    // Remove potentially dangerous Unicode characters
    sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\u2028-\u202F\uFFF9-\uFFFB]/g, '')

    // Limit length
    if (sanitized.length > this.MAX_PROMPT_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_PROMPT_LENGTH)
    }

    return sanitized
  }

  /**
   * Check for excessive repetition
   */
  private static hasExcessiveRepetition(text: string): boolean {
    // Check for repeated characters
    const charPattern = /(.)\1{20,}/
    if (charPattern.test(text)) return true

    // Check for repeated words
    const words = text.toLowerCase().split(/\s+/)
    const wordCounts = new Map<string, number>()

    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }

    // If any word appears more than 50 times, consider it excessive
    for (const count of wordCounts.values()) {
      if (count > 50) return true
    }

    return false
  }

  /**
   * Calculate overall risk level
   */
  private static calculateRiskLevel(
    current: 'low' | 'medium' | 'high' | 'critical',
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 }
    return levels[newLevel] > levels[current] ? newLevel : current
  }
}

/**
 * Security monitor for detecting patterns of abuse
 */
export class SecurityMonitor {
  private static suspiciousActivities = new Map<string, number>()
  private static readonly MAX_VIOLATIONS = 5
  private static readonly VIOLATION_WINDOW = 300000 // 5 minutes

  /**
   * Record a security violation
   */
  static recordViolation(userId: string, violationType: string): void {
    const key = `${userId}:${violationType}`
    const count = this.suspiciousActivities.get(key) || 0
    this.suspiciousActivities.set(key, count + 1)

    // Clean up old violations
    setTimeout(() => {
      const current = this.suspiciousActivities.get(key) || 0
      if (current <= 1) {
        this.suspiciousActivities.delete(key)
      } else {
        this.suspiciousActivities.set(key, current - 1)
      }
    }, this.VIOLATION_WINDOW)
  }

  /**
   * Check if user is blocked due to violations
   */
  static isUserBlocked(userId: string): boolean {
    let totalViolations = 0
    for (const [key, count] of this.suspiciousActivities) {
      if (key.startsWith(userId + ':')) {
        totalViolations += count
      }
    }
    return totalViolations >= this.MAX_VIOLATIONS
  }

  /**
   * Get violation count for user
   */
  static getViolationCount(userId: string): number {
    let total = 0
    for (const [key, count] of this.suspiciousActivities) {
      if (key.startsWith(userId + ':')) {
        total += count
      }
    }
    return total
  }
}