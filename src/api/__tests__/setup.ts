// Test setup for API tests

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test_anon_key'
process.env.JWT_SECRET = 'test_jwt_secret'

// Mock fetch for API client tests
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
const originalConsole = global.console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
})

afterAll(() => {
  global.console = originalConsole
})

// Setup and teardown for each test
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidUUID(): T
      toBeValidISODate(): T
      toHaveValidApiResponse(): T
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    }
  },

  toBeValidISODate(received: string) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime()) && received.includes('T')

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date`
          : `expected ${received} to be a valid ISO date`,
      pass,
    }
  },

  toHaveValidApiResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean'
    const hasTimestamp = typeof received.timestamp === 'string'
    const validTimestamp = hasTimestamp ? this.toBeValidISODate(received.timestamp) : false

    const pass = hasSuccess && hasTimestamp && validTimestamp

    return {
      message: () =>
        pass
          ? `expected response not to have valid API structure`
          : `expected response to have valid API structure with success, timestamp, and proper format`,
      pass,
    }
  },
})

// Test timeout
vi.setConfig({ testTimeout: 10000 })