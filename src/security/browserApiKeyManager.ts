/**
 * Browser-compatible API Key Management System
 * Simple implementation for browser environment without Node.js crypto dependencies
 */

export interface APIKeyConfig {
  keyId: string
  provider: string
  createdAt: number
  expiresAt?: number
  lastUsed?: number
  usageCount: number
  isActive: boolean
}

export interface APIKeyUsage {
  keyId: string
  timestamp: number
  success: boolean
  errorMessage?: string
}

export class BrowserAPIKeyManager {
  private static readonly KEY_ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000 // 30 days
  private static readonly MAX_KEY_AGE = 90 * 24 * 60 * 60 * 1000 // 90 days
  private static readonly USAGE_LOG_RETENTION = 7 * 24 * 60 * 60 * 1000 // 7 days

  private keyStore: Map<string, APIKeyConfig> = new Map()
  private usageLogs: APIKeyUsage[] = []

  /**
   * Add a new API key
   */
  addAPIKey(provider: string, apiKey: string, expiresAt?: number): string {
    const keyId = this.generateKeyId()

    const config: APIKeyConfig = {
      keyId,
      provider,
      createdAt: Date.now(),
      expiresAt,
      usageCount: 0,
      isActive: true
    }

    // Store in sessionStorage (encrypted with simple obfuscation)
    this.storeSecurely(keyId, apiKey, config)

    this.logSecurityEvent('API_KEY_ADDED', { keyId, provider, expiresAt })

    return keyId
  }

  /**
   * Get API key (with usage tracking)
   */
  getAPIKey(keyId: string): string | null {
    const config = this.keyStore.get(keyId)
    if (!config || !config.isActive) {
      return null
    }

    // Check if key has expired
    if (config.expiresAt && Date.now() > config.expiresAt) {
      this.deactivateKey(keyId, 'Key expired')
      return null
    }

    // Check if key is too old
    if (Date.now() - config.createdAt > BrowserAPIKeyManager.MAX_KEY_AGE) {
      this.deactivateKey(keyId, 'Key too old')
      return null
    }

    // Update usage
    config.usageCount++
    config.lastUsed = Date.now()

    const apiKey = this.retrieveSecurely(keyId)
    this.logUsage(keyId, !!apiKey)

    return apiKey
  }

  /**
   * Get API key without tracking usage (for health checks)
   */
  getAPIKeyNoTracking(keyId: string): string | null {
    const config = this.keyStore.get(keyId)
    if (!config || !config.isActive) {
      return null
    }

    return this.retrieveSecurely(keyId)
  }

  /**
   * Deactivate an API key
   */
  deactivateKey(keyId: string, reason?: string): void {
    const config = this.keyStore.get(keyId)
    if (config) {
      config.isActive = false
      this.logSecurityEvent('API_KEY_DEACTIVATED', { keyId, reason })
    }
  }

  /**
   * Get key configuration without exposing the actual key
   */
  getKeyConfig(keyId: string): Omit<APIKeyConfig, 'encryptedKey'> | null {
    const config = this.keyStore.get(keyId)
    if (!config) {
      return null
    }

    return config
  }

  /**
   * Get all active keys for a provider
   */
  getActiveKeys(provider: string): Omit<APIKeyConfig, 'encryptedKey'>[] {
    const keys: Omit<APIKeyConfig, 'encryptedKey'>[] = []

    for (const [keyId, config] of this.keyStore) {
      if (config.provider === provider && config.isActive) {
        keys.push(config)
      }
    }

    return keys.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Check if key rotation is needed
   */
  needsRotation(provider: string): boolean {
    const keys = this.getActiveKeys(provider)
    if (keys.length === 0) {
      return true
    }

    const oldestKey = keys[keys.length - 1]
    return Date.now() - oldestKey.createdAt > BrowserAPIKeyManager.KEY_ROTATION_INTERVAL
  }

  /**
   * Rotate API keys for a provider
   */
  rotateKeys(provider: string, newApiKey: string): string {
    // Deactivate old keys
    for (const [keyId, config] of this.keyStore) {
      if (config.provider === provider && config.isActive) {
        this.deactivateKey(keyId, 'Key rotation')
      }
    }

    // Add new key
    return this.addAPIKey(provider, newApiKey)
  }

  /**
   * Get usage statistics
   */
  getUsageStats(keyId: string): {
    totalUsage: number
    recentUsage: number
    successRate: number
    lastUsed: number | undefined
  } {
    const config = this.keyStore.get(keyId)
    if (!config) {
      return { totalUsage: 0, recentUsage: 0, successRate: 0, lastUsed: undefined }
    }

    const recentUsage = this.usageLogs.filter(
      log => log.keyId === keyId &&
      Date.now() - log.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length

    const successfulUsage = this.usageLogs.filter(
      log => log.keyId === keyId && log.success
    ).length

    const successRate = config.usageCount > 0 ? successfulUsage / config.usageCount : 0

    return {
      totalUsage: config.usageCount,
      recentUsage,
      successRate,
      lastUsed: config.lastUsed
    }
  }

  /**
   * Clean up old usage logs and expired keys
   */
  cleanup(): void {
    const now = Date.now()

    // Clean up old usage logs
    this.usageLogs = this.usageLogs.filter(
      log => now - log.timestamp < BrowserAPIKeyManager.USAGE_LOG_RETENTION
    )

    // Deactivate expired keys
    for (const [keyId, config] of this.keyStore) {
      if (config.expiresAt && now > config.expiresAt) {
        this.deactivateKey(keyId, 'Key expired during cleanup')
      } else if (now - config.createdAt > BrowserAPIKeyManager.MAX_KEY_AGE) {
        this.deactivateKey(keyId, 'Key too old during cleanup')
      }
    }
  }

  // Private methods

  private generateKeyId(): string {
    return 'key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private storeSecurely(keyId: string, apiKey: string, config: APIKeyConfig): void {
    // Simple obfuscation for browser storage (NOT for highly sensitive keys)
    const obfuscated = btoa(apiKey.split('').reverse().join(''))

    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(`api_key_${keyId}`, obfuscated)
    }

    this.keyStore.set(keyId, config)
  }

  private retrieveSecurely(keyId: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const obfuscated = sessionStorage.getItem(`api_key_${keyId}`)
        if (obfuscated) {
          return atob(obfuscated).split('').reverse().join('')
        }
      }
      return null
    } catch (error) {
      console.error('Failed to retrieve API key:', error)
      return null
    }
  }

  private logUsage(keyId: string, success: boolean, errorMessage?: string): void {
    this.usageLogs.push({
      keyId,
      timestamp: Date.now(),
      success,
      errorMessage
    })

    // Clean up if logs get too large
    if (this.usageLogs.length > 10000) {
      this.cleanup()
    }
  }

  private logSecurityEvent(event: string, data: any): void {
    // In a real implementation, this would log to a secure audit system
    console.log(`[Security] ${event}:`, data)
  }
}

/**
 * Environment-specific API Key Manager for browser
 * Handles loading and managing API keys from environment variables securely
 */
export class EnvironmentBrowserAPIKeyManager {
  private static instance: EnvironmentBrowserAPIKeyManager
  private keyManager: BrowserAPIKeyManager

  private constructor() {
    this.keyManager = new BrowserAPIKeyManager()
    this.initializeFromEnvironment()
  }

  static getInstance(): EnvironmentBrowserAPIKeyManager {
    if (!EnvironmentBrowserAPIKeyManager.instance) {
      EnvironmentBrowserAPIKeyManager.instance = new EnvironmentBrowserAPIKeyManager()
    }
    return EnvironmentBrowserAPIKeyManager.instance
  }

  private initializeFromEnvironment(): void {
    // For browser environment, get keys from import.meta.env
    const glmKey = this.getSecureEnvVar('VITE_GLM_API_KEY')
    if (glmKey) {
      this.keyManager.addAPIKey('glm', glmKey)
    }

    const openaiKey = this.getSecureEnvVar('VITE_OPENAI_API_KEY')
    if (openaiKey) {
      this.keyManager.addAPIKey('openai', openaiKey)
    }

    // Add other providers as needed
  }

  private getSecureEnvVar(key: string): string | undefined {
    try {
      const value = (import.meta.env as any)[key]
      if (!value) {
        return undefined
      }

      // Basic validation
      if (value.length < 10) {
        console.warn(`Environment variable ${key} appears to be invalid`)
        return undefined
      }

      return value
    } catch (error) {
      console.error(`Failed to read environment variable ${key}:`, error)
      return undefined
    }
  }

  getAPIKey(provider: string): string | null {
    const keys = this.keyManager.getActiveKeys(provider)
    if (keys.length === 0) {
      return null
    }

    // Use the most recently created key
    return this.keyManager.getAPIKey(keys[0].keyId)
  }

  getKeyManager(): BrowserAPIKeyManager {
    return this.keyManager
  }
}