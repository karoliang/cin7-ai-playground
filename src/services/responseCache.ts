import {
  CacheConfig,
  CacheEntry,
  CacheStrategy,
  CacheStorage,
  AIGatewayRequest,
  AIGatewayResponse
} from '@/types/aiGateway'
import { createHash } from 'crypto'

/**
 * Response Cache Service
 * Provides intelligent caching for AI Gateway responses with multiple strategies
 */
export class ResponseCacheService {
  private config: CacheConfig
  private storage: CacheStorageAdapter
  private keyGenerator: CacheKeyGenerator
  private metrics: CacheMetrics
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: CacheConfig) {
    this.config = config
    this.storage = this.createStorageAdapter(config.storage)
    this.keyGenerator = new CacheKeyGenerator(config.keyGenerator)
    this.metrics = new CacheMetrics()

    // Start cleanup timer
    this.startCleanupTimer()
  }

  /**
   * Get cached response for a request
   */
  async get(request: AIGatewayRequest): Promise<AIGatewayResponse | null> {
    if (!this.config.enabled) {
      return null
    }

    try {
      const key = this.keyGenerator.generateKey(request)
      const entry = await this.storage.get(key)

      if (!entry) {
        this.metrics.recordMiss()
        return null
      }

      // Check if entry is expired
      if (this.isExpired(entry)) {
        await this.storage.delete(key)
        this.metrics.recordMiss()
        return null
      }

      // Update hit count and access time
      entry.hitCount++
      await this.storage.update(key, entry)

      this.metrics.recordHit()

      // Return cached response
      return {
        ...entry.response,
        cached: true,
        metadata: {
          ...entry.response.metadata,
          cached: true,
          cacheHitCount: entry.hitCount
        }
      }

    } catch (error) {
      console.error('[Response Cache] Error getting cached response:', error)
      this.metrics.recordError()
      return null
    }
  }

  /**
   * Store response in cache
   */
  async set(request: AIGatewayRequest, response: AIGatewayResponse): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const key = this.keyGenerator.generateKey(request)

      const entry: CacheEntry = {
        key,
        request,
        response,
        timestamp: Date.now(),
        ttl: this.config.ttl,
        hitCount: 1
      }

      await this.storage.set(key, entry)
      this.metrics.recordSet()

    } catch (error) {
      console.error('[Response Cache] Error storing response:', error)
      this.metrics.recordError()
    }
  }

  /**
   * Delete cached response
   */
  async delete(request: AIGatewayRequest): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const key = this.keyGenerator.generateKey(request)
      await this.storage.delete(key)
      this.metrics.recordDelete()

    } catch (error) {
      console.error('[Response Cache] Error deleting cached response:', error)
      this.metrics.recordError()
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      await this.storage.clear()
      this.metrics.reset()

    } catch (error) {
      console.error('[Response Cache] Error clearing cache:', error)
      this.metrics.recordError()
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.metrics.getStats(),
      config: {
        enabled: this.config.enabled,
        strategy: this.config.strategy,
        maxSize: this.config.maxSize,
        ttl: this.config.ttl,
        storageType: this.config.storage.type
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    if (!this.config.enabled) {
      return 0
    }

    try {
      const keys = await this.storage.getAllKeys()
      let deletedCount = 0

      for (const key of keys) {
        const entry = await this.storage.get(key)
        if (entry && this.isExpired(entry)) {
          await this.storage.delete(key)
          deletedCount++
        }
      }

      return deletedCount

    } catch (error) {
      console.error('[Response Cache] Error during cleanup:', error)
      return 0
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now()
    const age = now - entry.timestamp
    return age > entry.ttl
  }

  /**
   * Create storage adapter based on configuration
   */
  private createStorageAdapter(config: CacheStorage): CacheStorageAdapter {
    switch (config.type) {
      case 'memory':
        return new MemoryCacheStorage(config.config, this.config.maxSize, this.config.strategy)
      case 'redis':
        return new RedisCacheStorage(config.config)
      case 'localstorage':
        return new LocalStorageCacheStorage(config.config)
      default:
        throw new Error(`Unsupported cache storage type: ${config.type}`)
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Run cleanup every 5 minutes
    this.cleanupTimer = setInterval(async () => {
      const deletedCount = await this.cleanup()
      if (deletedCount > 0) {
        console.log(`[Response Cache] Cleaned up ${deletedCount} expired entries`)
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

/**
 * Cache Key Generator
 * Generates consistent cache keys for requests
 */
class CacheKeyGenerator {
  private config: any

  constructor(config: any) {
    this.config = config
  }

  generateKey(request: AIGatewayRequest): string {
    let keyData = ''

    // Always include basic request data
    keyData += `${request.provider}:${request.model}:`
    keyData += JSON.stringify(request.messages)

    // Include context if configured
    if (this.config.includeContext && request.context) {
      keyData += `:context:${JSON.stringify(request.context)}`
    }

    // Include options if configured
    if (this.config.includeOptions && request.options) {
      keyData += `:options:${JSON.stringify(request.options)}`
    }

    // Generate hash based on algorithm
    switch (this.config.algorithm) {
      case 'sha256':
        return createHash('sha256').update(keyData).digest('hex')
      case 'md5':
        return createHash('md5').update(keyData).digest('hex')
      case 'custom':
        if (this.config.customFunction) {
          return this.config.customFunction(request)
        }
        // Fall back to sha256
        return createHash('sha256').update(keyData).digest('hex')
      default:
        return createHash('sha256').update(keyData).digest('hex')
    }
  }
}

/**
 * Cache Metrics
 * Tracks cache performance metrics
 */
class CacheMetrics {
  private hits = 0
  private misses = 0
  private sets = 0
  private deletes = 0
  private errors = 0

  recordHit(): void {
    this.hits++
  }

  recordMiss(): void {
    this.misses++
  }

  recordSet(): void {
    this.sets++
  }

  recordDelete(): void {
    this.deletes++
  }

  recordError(): void {
    this.errors++
  }

  reset(): void {
    this.hits = 0
    this.misses = 0
    this.sets = 0
    this.deletes = 0
    this.errors = 0
  }

  getStats(): CacheStats['metrics'] {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      errors: this.errors,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      totalRequests: total
    }
  }
}

/**
 * Cache Storage Adapter Interface
 */
interface CacheStorageAdapter {
  get(key: string): Promise<CacheEntry | null>
  set(key: string, entry: CacheEntry): Promise<void>
  update(key: string, entry: CacheEntry): Promise<void>
  delete(key: string): Promise<void>
  getAllKeys(): Promise<string[]>
  clear(): Promise<void>
}

/**
 * Memory Cache Storage
 * In-memory cache implementation with configurable eviction strategies
 */
class MemoryCacheStorage implements CacheStorageAdapter {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private strategy: CacheStrategy
  private accessOrder = new Map<string, number>()
  private accessCounter = 0

  constructor(config: any, maxSize: number, strategy: CacheStrategy) {
    this.maxSize = maxSize
    this.strategy = strategy
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key)
    if (entry) {
      this.updateAccessOrder(key)
    }
    return entry || null
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      await this.evictEntry()
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
  }

  async update(key: string, entry: CacheEntry): Promise<void> {
    if (this.cache.has(key)) {
      this.cache.set(key, entry)
      this.updateAccessOrder(key)
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
    this.accessOrder.delete(key)
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.cache.keys())
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCounter = 0
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter)
  }

  private async evictEntry(): Promise<void> {
    switch (this.strategy) {
      case 'lru':
        await this.evictLRU()
        break
      case 'lfu':
        await this.evictLFU()
        break
      case 'ttl':
        await this.evictOldest()
        break
      default:
        await this.evictLRU()
    }
  }

  private async evictLRU(): Promise<void> {
    let oldestKey = ''
    let oldestAccess = Infinity

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime
        oldestKey = key
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey)
    }
  }

  private async evictLFU(): Promise<void> {
    let leastUsedKey = ''
    let leastHits = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.hitCount < leastHits) {
        leastHits = entry.hitCount
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      await this.delete(leastUsedKey)
    }
  }

  private async evictOldest(): Promise<void> {
    let oldestKey = ''
    let oldestTimestamp = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey)
    }
  }
}

/**
 * Redis Cache Storage
 * Redis-based cache implementation (placeholder)
 */
class RedisCacheStorage implements CacheStorageAdapter {
  private config: any

  constructor(config: any) {
    this.config = config
    // In a real implementation, you would initialize Redis client here
    console.warn('[Response Cache] Redis storage not implemented, falling back to memory')
  }

  async get(key: string): Promise<CacheEntry | null> {
    // Placeholder implementation
    return null
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // Placeholder implementation
  }

  async update(key: string, entry: CacheEntry): Promise<void> {
    // Placeholder implementation
  }

  async delete(key: string): Promise<void> {
    // Placeholder implementation
  }

  async getAllKeys(): Promise<string[]> {
    // Placeholder implementation
    return []
  }

  async clear(): Promise<void> {
    // Placeholder implementation
  }
}

/**
 * Local Storage Cache Storage
 * Browser localStorage-based cache implementation
 */
class LocalStorageCacheStorage implements CacheStorageAdapter {
  private prefix: string

  constructor(config: any) {
    this.prefix = config.prefix || 'ai-gateway-cache-'
  }

  async get(key: string): Promise<CacheEntry | null> {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) {
        return null
      }

      return JSON.parse(item)
    } catch (error) {
      console.error('[LocalStorage Cache] Error getting item:', error)
      return null
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry))
    } catch (error) {
      console.error('[LocalStorage Cache] Error setting item:', error)
    }
  }

  async update(key: string, entry: CacheEntry): Promise<void> {
    await this.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error('[LocalStorage Cache] Error deleting item:', error)
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length))
        }
      }
      return keys
    } catch (error) {
      console.error('[LocalStorage Cache] Error getting all keys:', error)
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.getAllKeys()
      for (const key of keys) {
        await this.delete(key)
      }
    } catch (error) {
      console.error('[LocalStorage Cache] Error clearing storage:', error)
    }
  }
}

/**
 * Cache Statistics Interface
 */
export interface CacheStats {
  metrics: {
    hits: number
    misses: number
    sets: number
    deletes: number
    errors: number
    hitRate: number
    totalRequests: number
  }
  config: {
    enabled: boolean
    strategy: CacheStrategy
    maxSize: number
    ttl: number
    storageType: string
  }
}

// Export singleton instance factory
export function createResponseCache(config: CacheConfig): ResponseCacheService {
  return new ResponseCacheService(config)
}