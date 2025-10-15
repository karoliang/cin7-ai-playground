/**
 * Secure API Key Management System
 * Provides secure handling of API keys with encryption and rotation
 */

import crypto from 'crypto'

export interface APIKeyConfig {
  keyId: string
  encryptedKey: string
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

export class SecureAPIKeyManager {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000 // 30 days
  private static readonly MAX_KEY_AGE = 90 * 24 * 60 * 60 * 1000 // 90 days
  private static readonly USAGE_LOG_RETENTION = 7 * 24 * 60 * 60 * 1000 // 7 days

  private encryptionKey: Buffer
  private keyStore: Map<string, APIKeyConfig> = new Map()
  private usageLogs: APIKeyUsage[] = []

  constructor(encryptionKey: string) {
    this.encryptionKey = Buffer.from(encryptionKey, 'hex')
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)')
    }
  }

  /**
   * Add a new API key securely
   */
  addAPIKey(provider: string, apiKey: string, expiresAt?: number): string {
    const keyId = this.generateKeyId()
    const encryptedKey = this.encrypt(apiKey)

    const config: APIKeyConfig = {
      keyId,
      encryptedKey,
      provider,
      createdAt: Date.now(),
      expiresAt,
      usageCount: 0,
      isActive: true
    }

    this.keyStore.set(keyId, config)
    this.logSecurityEvent('API_KEY_ADDED', { keyId, provider, expiresAt })

    return keyId
  }

  /**
   * Get decrypted API key (with usage tracking)
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
    if (Date.now() - config.createdAt > this.MAX_KEY_AGE) {
      this.deactivateKey(keyId, 'Key too old')
      return null
    }

    // Update usage
    config.usageCount++
    config.lastUsed = Date.now()

    const decryptedKey = this.decrypt(config.encryptedKey)
    this.logUsage(keyId, true)

    return decryptedKey
  }

  /**
   * Get API key without tracking usage (for health checks)
   */
  getAPIKeyNoTracking(keyId: string): string | null {
    const config = this.keyStore.get(keyId)
    if (!config || !config.isActive) {
      return null
    }

    return this.decrypt(config.encryptedKey)
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

    const { encryptedKey, ...safeConfig } = config
    return safeConfig
  }

  /**
   * Get all active keys for a provider
   */
  getActiveKeys(provider: string): Omit<APIKeyConfig, 'encryptedKey'>[] {
    const keys: Omit<APIKeyConfig, 'encryptedKey'>[] = []

    for (const [keyId, config] of this.keyStore) {
      if (config.provider === provider && config.isActive) {
        const { encryptedKey, ...safeConfig } = config
        keys.push(safeConfig)
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
    return Date.now() - oldestKey.createdAt > this.KEY_ROTATION_INTERVAL
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
      log => now - log.timestamp < this.USAGE_LOG_RETENTION
    )

    // Deactivate expired keys
    for (const [keyId, config] of this.keyStore) {
      if (config.expiresAt && now > config.expiresAt) {
        this.deactivateKey(keyId, 'Key expired during cleanup')
      } else if (now - config.createdAt > this.MAX_KEY_AGE) {
        this.deactivateKey(keyId, 'Key too old during cleanup')
      }
    }
  }

  /**
   * Export security metrics (without exposing sensitive data)
   */
  getSecurityMetrics(): {
    totalKeys: number
    activeKeys: number
    keysByProvider: Record<string, number>
    averageKeyAge: number
    usageStats: Record<string, any>
  } {
    const keysByProvider: Record<string, number> = {}
    let totalAge = 0
    let activeKeys = 0

    for (const config of this.keyStore.values()) {
      keysByProvider[config.provider] = (keysByProvider[config.provider] || 0) + 1
      totalAge += Date.now() - config.createdAt
      if (config.isActive) {
        activeKeys++
      }
    }

    const averageKeyAge = this.keyStore.size > 0 ? totalAge / this.keyStore.size : 0

    const usageStats: Record<string, any> = {}
    for (const [keyId, config] of this.keyStore) {
      if (config.isActive) {
        usageStats[keyId] = this.getUsageStats(keyId)
      }
    }

    return {
      totalKeys: this.keyStore.size,
      activeKeys,
      keysByProvider,
      averageKeyAge,
      usageStats
    }
  }

  // Private methods

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, this.encryptionKey)
    cipher.setAAD(Buffer.from('api-key', 'utf8'))

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, this.encryptionKey)
    decipher.setAAD(Buffer.from('api-key', 'utf8'))
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  private generateKeyId(): string {
    return 'key_' + crypto.randomBytes(16).toString('hex')
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
 * Environment-specific API Key Manager
 * Handles loading and managing API keys from environment variables securely
 */
export class EnvironmentAPIKeyManager {
  private static instance: EnvironmentAPIKeyManager
  private keyManager: SecureAPIKeyManager

  private constructor(encryptionKey: string) {
    this.keyManager = new SecureAPIKeyManager(encryptionKey)
    this.initializeFromEnvironment()
  }

  static getInstance(encryptionKey?: string): EnvironmentAPIKeyManager {
    if (!EnvironmentAPIKeyManager.instance) {
      if (!encryptionKey) {
        throw new Error('Encryption key required for first initialization')
      }
      EnvironmentAPIKeyManager.instance = new EnvironmentAPIKeyManager(encryptionKey)
    }
    return EnvironmentAPIKeyManager.instance
  }

  private initializeFromEnvironment(): void {
    // GLM API Key
    const glmKey = this.getSecureEnvVar('GLM_API_KEY')
    if (glmKey) {
      this.keyManager.addAPIKey('glm', glmKey)
    }

    // OpenAI API Key (if available)
    const openaiKey = this.getSecureEnvVar('OPENAI_API_KEY')
    if (openaiKey) {
      this.keyManager.addAPIKey('openai', openaiKey)
    }

    // Add other providers as needed
  }

  private getSecureEnvVar(key: string): string | undefined {
    const value = process.env[key]
    if (!value) {
      return undefined
    }

    // Basic validation
    if (value.length < 10) {
      throw new Error(`Environment variable ${key} appears to be invalid`)
    }

    return value
  }

  getAPIKey(provider: string): string | null {
    const keys = this.keyManager.getActiveKeys(provider)
    if (keys.length === 0) {
      return null
    }

    // Use the most recently created key
    return this.keyManager.getAPIKey(keys[0].keyId)
  }

  getKeyManager(): SecureAPIKeyManager {
    return this.keyManager
  }
}