/**
 * Secure API Key Management System
 * Provides secure handling of API keys with encryption and rotation
 */

// Browser-compatible crypto implementation
const createBrowserCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto
  }
  // Fallback for non-browser environments or development
  return null
}

const browserCrypto = createBrowserCrypto()

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
  async addAPIKey(provider: string, apiKey: string, expiresAt?: number): Promise<string> {
    const keyId = this.generateKeyId()
    const encryptedKey = await this.encrypt(apiKey)

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
  async getAPIKey(keyId: string): Promise<string | null> {
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
    if (Date.now() - config.createdAt > SecureAPIKeyManager.MAX_KEY_AGE) {
      this.deactivateKey(keyId, 'Key too old')
      return null
    }

    // Update usage
    config.usageCount++
    config.lastUsed = Date.now()

    const decryptedKey = await this.decrypt(config.encryptedKey)
    this.logUsage(keyId, true)

    return decryptedKey
  }

  /**
   * Get API key without tracking usage (for health checks)
   */
  async getAPIKeyNoTracking(keyId: string): Promise<string | null> {
    const config = this.keyStore.get(keyId)
    if (!config || !config.isActive) {
      return null
    }

    return await this.decrypt(config.encryptedKey)
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
    return Date.now() - oldestKey.createdAt > SecureAPIKeyManager.KEY_ROTATION_INTERVAL
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
      log => now - log.timestamp < SecureAPIKeyManager.USAGE_LOG_RETENTION
    )

    // Deactivate expired keys
    for (const [keyId, config] of this.keyStore) {
      if (config.expiresAt && now > config.expiresAt) {
        this.deactivateKey(keyId, 'Key expired during cleanup')
      } else if (now - config.createdAt > SecureAPIKeyManager.MAX_KEY_AGE) {
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

  private async encrypt(text: string): Promise<string> {
    if (browserCrypto) {
      try {
        // Use Web Crypto API for browser environments
        const iv = browserCrypto.getRandomValues(new Uint8Array(16))

        // Import the encryption key
        const key = await browserCrypto.subtle.importKey(
          'raw',
          this.encryptionKey,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        )

        // Encrypt the data
        const encodedText = new TextEncoder().encode(text)
        const encryptedData = await browserCrypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            additionalData: new TextEncoder().encode('api-key')
          },
          key,
          encodedText
        )

        const encryptedArray = new Uint8Array(encryptedData)
        const authTag = encryptedArray.slice(-16)
        const encrypted = encryptedArray.slice(0, -16)

        // Combine IV, auth tag, and encrypted data
        const result = new Uint8Array(iv.length + authTag.length + encrypted.length)
        result.set(iv)
        result.set(authTag, iv.length)
        result.set(encrypted, iv.length + authTag.length)

        return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('')
      } catch (error) {
        console.warn('Web Crypto API failed, using fallback:', error)
        return this.fallbackEncrypt(text)
      }
    } else {
      return this.fallbackEncrypt(text)
    }
  }

  private async decrypt(encryptedText: string): Promise<string> {
    if (browserCrypto) {
      try {
        const hexString = encryptedText
        const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))

        const iv = bytes.slice(0, 16)
        const authTag = bytes.slice(16, 32)
        const encrypted = bytes.slice(32)

        // Import the decryption key
        const key = await browserCrypto.subtle.importKey(
          'raw',
          this.encryptionKey,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        )

        // Decrypt the data
        const decryptedData = await browserCrypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            additionalData: new TextEncoder().encode('api-key')
          },
          key,
          new Uint8Array([...encrypted, ...authTag])
        )

        return new TextDecoder().decode(decryptedData)
      } catch (error) {
        console.warn('Web Crypto API failed, using fallback:', error)
        return this.fallbackDecrypt(encryptedText)
      }
    } else {
      return this.fallbackDecrypt(encryptedText)
    }
  }

  private generateKeyId(): string {
    if (browserCrypto) {
      const randomArray = new Uint8Array(16)
      browserCrypto.getRandomValues(randomArray)
      return 'key_' + Array.from(randomArray).map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      // Fallback for development/non-browser environments
      return 'key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
  }

  // Fallback methods for development or when crypto is not available
  private fallbackEncrypt(text: string): string {
    // Simple XOR-based fallback for development (NOT SECURE for production)
    const key = this.encryptionKey
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key[i % key.length])
    }
    return btoa(result) // Base64 encode
  }

  private fallbackDecrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText) // Base64 decode
      const key = this.encryptionKey
      let result = ''
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key[i % key.length])
      }
      return result
    } catch (error) {
      throw new Error('Failed to decrypt with fallback method')
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