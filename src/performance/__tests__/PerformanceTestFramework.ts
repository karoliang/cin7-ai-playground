/**
 * Performance Testing Framework
 * Comprehensive performance testing and benchmarking suite
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'

export interface TestConfig {
  concurrency: number
  duration: number // in seconds
  rampUpTime: number // in seconds
  thinkTime: number // in milliseconds between requests
  scenarios: TestScenario[]
  thresholds: PerformanceThresholds
  reporting: {
    enableDetailedLogs: boolean
    enableTracing: boolean
    enableProfiling: boolean
    reportFormat: 'json' | 'html' | 'csv'
  }
}

export interface TestScenario {
  name: string
  weight: number // percentage of total requests
  requests: TestRequest[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface TestRequest {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: any
  expectedStatus?: number
  timeout?: number
  thinkTime?: number
}

export interface PerformanceThresholds {
  responseTime: {
    avg: number // ms
    p95: number // ms
    p99: number // ms
  }
  throughput: {
    min: number // requests per second
  }
  errorRate: {
    max: number // percentage
  }
  memory: {
    max: number // MB
  }
  cpu: {
    max: number // percentage
  }
}

export interface TestResult {
  scenario: string
  request: string
  success: boolean
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: number
  memoryBefore: number
  memoryAfter: number
  cpuBefore: number
  cpuAfter: number
}

export interface PerformanceReport {
  testId: string
  testName: string
  startTime: number
  endTime: number
  duration: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  errorRate: number
  throughput: number
  responseTime: {
    min: number
    max: number
    avg: number
    p50: number
    p90: number
    p95: number
    p99: number
  }
  memoryUsage: {
    min: number
    max: number
    avg: number
  }
  cpuUsage: {
    min: number
    max: number
    avg: number
  }
  scenarios: {
    [scenarioName: string]: {
      requests: number
      avgResponseTime: number
      errorRate: number
    }
  }
  thresholds: {
    passed: boolean
    failed: string[]
  }
  results: TestResult[]
}

/**
 * Performance Test Framework
 */
export class PerformanceTestFramework extends EventEmitter {
  private config: TestConfig
  private isRunning = false
  private testResults: TestResult[] = []
  private activeConnections = 0
  private startTime = 0
  private endTime = 0

  constructor(config: TestConfig) {
    super()
    this.config = config
  }

  /**
   * Run performance test
   */
  async runTest(testName: string): Promise<PerformanceReport> {
    if (this.isRunning) {
      throw new Error('Test is already running')
    }

    this.isRunning = true
    this.testResults = []
    this.startTime = Date.now()
    const testId = this.generateTestId()

    try {
      this.emit('test:started', { testId, testName })

      // Setup scenarios
      for (const scenario of this.config.scenarios) {
        if (scenario.setup) {
          await scenario.setup()
        }
      }

      // Execute test scenarios
      await this.executeScenarios(testId)

      // Teardown scenarios
      for (const scenario of this.config.scenarios) {
        if (scenario.teardown) {
          await scenario.teardown()
        }
      }

      this.endTime = Date.now()
      const report = this.generateReport(testId, testName)

      this.emit('test:completed', { testId, testName, report })
      return report

    } catch (error) {
      this.emit('test:failed', { testId, testName, error })
      throw error

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Run load test
   */
  async runLoadTest(testName: string, targetRPS: number): Promise<PerformanceReport> {
    const loadConfig: TestConfig = {
      ...this.config,
      concurrency: Math.min(this.config.concurrency, targetRPS),
      scenarios: this.config.scenarios.map(scenario => ({
        ...scenario,
        requests: scenario.requests.map(req => ({
          ...req,
          thinkTime: 1000 / targetRPS // Adjust think time to meet target RPS
        }))
      }))
    }

    const loadTester = new PerformanceTestFramework(loadConfig)
    return loadTester.runTest(testName)
  }

  /**
   * Run stress test
   */
  async runStressTest(testName: string, maxConcurrency: number): Promise<PerformanceReport> {
    const stressConfig: TestConfig = {
      ...this.config,
      concurrency: maxConcurrency,
      duration: 600, // 10 minutes
      scenarios: this.config.scenarios.map(scenario => ({
        ...scenario,
        thinkTime: 0 // No think time for stress test
      }))
    }

    const stressTester = new PerformanceTestFramework(stressConfig)
    return stressTester.runTest(testName)
  }

  /**
   * Run spike test
   */
  async runSpikeTest(testName: string, normalRPS: number, spikeRPS: number, spikeDuration: number): Promise<PerformanceReport> {
    const spikeConfig: TestConfig = {
      ...this.config,
      concurrency: spikeRPS,
      duration: 300, // 5 minutes total
      scenarios: this.config.scenarios
    }

    const spikeTester = new PerformanceTestFramework(spikeConfig)

    // Run normal load first
    await spikeTester.runLoadTest(`${testName}-normal`, normalRPS)

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 30000))

    // Run spike load
    return spikeTester.runLoadTest(`${testName}-spike`, spikeRPS)
  }

  /**
   * Run endurance test
   */
  async runEnduranceTest(testName: string, durationHours: number): Promise<PerformanceReport> {
    const enduranceConfig: TestConfig = {
      ...this.config,
      duration: durationHours * 3600, // Convert hours to seconds
      scenarios: this.config.scenarios
    }

    const enduranceTester = new PerformanceTestFramework(enduranceConfig)
    return enduranceTester.runTest(testName)
  }

  /**
   * Get current test status
   */
  getTestStatus(): {
    isRunning: boolean
    activeConnections: number
    duration: number
    requestsPerSecond: number
  } {
    const duration = this.isRunning ? (Date.now() - this.startTime) / 1000 : 0
    const requestsPerSecond = duration > 0 ? this.testResults.length / duration : 0

    return {
      isRunning: this.isRunning,
      activeConnections: this.activeConnections,
      duration,
      requestsPerSecond
    }
  }

  /**
   * Stop running test
   */
  stopTest(): void {
    if (this.isRunning) {
      this.isRunning = false
      this.emit('test:stopped')
    }
  }

  // Private methods

  private async executeScenarios(testId: string): Promise<void> {
    const scenarioPromises: Promise<void>[] = []

    for (const scenario of this.config.scenarios) {
      const scenarioPromise = this.executeScenario(testId, scenario)
      scenarioPromises.push(scenarioPromise)
    }

    await Promise.all(scenarioPromises)
  }

  private async executeScenario(testId: string, scenario: TestScenario): Promise<void> {
    const durationMs = this.config.duration * 1000
    const rampUpMs = this.config.rampUpTime * 1000
    const endTime = Date.now() + durationMs

    // Calculate concurrent users for this scenario
    const scenarioConcurrency = Math.floor(
      (this.config.concurrency * scenario.weight) / 100
    )

    while (Date.now() < endTime && this.isRunning) {
      const activePromises: Promise<void>[] = []

      // Ramp up logic
      const elapsed = Date.now() - this.startTime
      const rampUpProgress = Math.min(1, elapsed / rampUpMs)
      const currentConcurrency = Math.floor(scenarioConcurrency * rampUpProgress)

      // Execute requests concurrently
      for (let i = 0; i < currentConcurrency; i++) {
        const promise = this.executeRequests(testId, scenario)
        activePromises.push(promise)
      }

      // Wait for all requests in this batch
      await Promise.allSettled(activePromises)

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  private async executeRequests(testId: string, scenario: TestScenario): Promise<void> {
    for (const request of scenario.requests) {
      if (!this.isRunning) break

      const result = await this.executeRequest(testId, scenario.name, request)
      this.testResults.push(result)

      // Think time
      if (request.thinkTime || this.config.thinkTime) {
        await new Promise(resolve =>
          setTimeout(resolve, request.thinkTime || this.config.thinkTime)
        )
      }
    }
  }

  private async executeRequest(
    testId: string,
    scenarioName: string,
    request: TestRequest
  ): Promise<TestResult> {
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()
    const cpuBefore = this.getCpuUsage()

    try {
      this.activeConnections++

      // Simulate HTTP request
      const response = await this.simulateRequest(request)

      const endTime = performance.now()
      const memoryAfter = this.getMemoryUsage()
      const cpuAfter = this.getCpuUsage()
      const responseTime = endTime - startTime

      const success = response.status === (request.expectedStatus || 200)

      const result: TestResult = {
        scenario: scenarioName,
        request: request.name,
        success,
        responseTime,
        statusCode: response.status,
        timestamp: Date.now(),
        memoryBefore,
        memoryAfter,
        cpuBefore,
        cpuAfter
      }

      if (!success) {
        result.error = `Expected status ${request.expectedStatus || 200}, got ${response.status}`
      }

      this.emit('request:completed', { testId, scenarioName, request: request.name, result })
      return result

    } catch (error) {
      const endTime = performance.now()
      const memoryAfter = this.getMemoryUsage()
      const cpuAfter = this.getCpuUsage()
      const responseTime = endTime - startTime

      const result: TestResult = {
        scenario: scenarioName,
        request: request.name,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        memoryBefore,
        memoryAfter,
        cpuBefore,
        cpuAfter
      }

      this.emit('request:failed', { testId, scenarioName, request: request.name, error, result })
      return result

    } finally {
      this.activeConnections--
    }
  }

  private async simulateRequest(request: TestRequest): Promise<{ status: number; body?: any }> {
    // Simulate network latency
    const baseLatency = 100 + Math.random() * 200
    const complexityLatency = request.body ? JSON.stringify(request.body).length * 0.1 : 0
    const totalLatency = baseLatency + complexityLatency

    await new Promise(resolve => setTimeout(resolve, totalLatency))

    // Simulate response status (90% success rate)
    const status = Math.random() > 0.1 ? (request.expectedStatus || 200) : 500

    return { status }
  }

  private generateReport(testId: string, testName: string): PerformanceReport {
    const duration = (this.endTime - this.startTime) / 1000
    const totalRequests = this.testResults.length
    const successfulRequests = this.testResults.filter(r => r.success).length
    const failedRequests = totalRequests - successfulRequests
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0
    const throughput = totalRequests / duration

    // Calculate response time percentiles
    const responseTimes = this.testResults.map(r => r.responseTime).sort((a, b) => a - b)
    const responseTimeStats = this.calculatePercentiles(responseTimes)

    // Calculate memory usage stats
    const memoryUsages = this.testResults.map(r => r.memoryAfter)
    const memoryStats = this.calculatePercentiles(memoryUsages)

    // Calculate CPU usage stats
    const cpuUsages = this.testResults.map(r => r.cpuAfter)
    const cpuStats = this.calculatePercentiles(cpuUsages)

    // Group results by scenario
    const scenarioResults: { [scenarioName: string]: TestResult[] } = {}
    for (const result of this.testResults) {
      if (!scenarioResults[result.scenario]) {
        scenarioResults[result.scenario] = []
      }
      scenarioResults[result.scenario].push(result)
    }

    const scenarios: { [scenarioName: string]: any } = {}
    for (const [scenarioName, results] of Object.entries(scenarioResults)) {
      const successful = results.filter(r => r.success).length
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length

      scenarios[scenarioName] = {
        requests: results.length,
        avgResponseTime,
        errorRate: ((results.length - successful) / results.length) * 100
      }
    }

    // Check thresholds
    const thresholds = this.checkThresholds(responseTimeStats, throughput, errorRate, memoryStats, cpuStats)

    return {
      testId,
      testName,
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      throughput,
      responseTime: responseTimeStats,
      memoryUsage: memoryStats,
      cpuUsage: cpuStats,
      scenarios,
      thresholds,
      results: this.testResults
    }
  }

  private calculatePercentiles(values: number[]): {
    min: number
    max: number
    avg: number
    p50: number
    p90: number
    p95: number
    p99: number
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length

    const getPercentile = (p: number): number => {
      const index = Math.ceil((p / 100) * sorted.length) - 1
      return sorted[Math.max(0, index)]
    }

    return {
      min,
      max,
      avg,
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    }
  }

  private checkThresholds(
    responseTime: any,
    throughput: number,
    errorRate: number,
    memory: any,
    cpu: any
  ): { passed: boolean; failed: string[] } {
    const failed: string[] = []

    if (responseTime.avg > this.config.thresholds.responseTime.avg) {
      failed.push(`Average response time ${responseTime.avg.toFixed(0)}ms exceeds threshold ${this.config.thresholds.responseTime.avg}ms`)
    }

    if (responseTime.p95 > this.config.thresholds.responseTime.p95) {
      failed.push(`95th percentile response time ${responseTime.p95.toFixed(0)}ms exceeds threshold ${this.config.thresholds.responseTime.p95}ms`)
    }

    if (responseTime.p99 > this.config.thresholds.responseTime.p99) {
      failed.push(`99th percentile response time ${responseTime.p99.toFixed(0)}ms exceeds threshold ${this.config.thresholds.responseTime.p99}ms`)
    }

    if (throughput < this.config.thresholds.throughput.min) {
      failed.push(`Throughput ${throughput.toFixed(2)} RPS below threshold ${this.config.thresholds.throughput.min} RPS`)
    }

    if (errorRate > this.config.thresholds.errorRate.max) {
      failed.push(`Error rate ${errorRate.toFixed(2)}% exceeds threshold ${this.config.thresholds.errorRate.max}%`)
    }

    if (memory.max > this.config.thresholds.memory.max) {
      failed.push(`Memory usage ${memory.max.toFixed(2)}MB exceeds threshold ${this.config.thresholds.memory.max}MB`)
    }

    if (cpu.max > this.config.thresholds.cpu.max) {
      failed.push(`CPU usage ${cpu.max.toFixed(2)}% exceeds threshold ${this.config.thresholds.cpu.max}%`)
    }

    return {
      passed: failed.length === 0,
      failed
    }
  }

  private getMemoryUsage(): number {
    // Simulate memory usage in MB
    return 50 + Math.random() * 200
  }

  private getCpuUsage(): number {
    // Simulate CPU usage percentage
    return 10 + Math.random() * 80
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Predefined test configurations
 */
export const StandardTestConfigs = {
  // Basic smoke test
  smokeTest: {
    concurrency: 5,
    duration: 30,
    rampUpTime: 10,
    thinkTime: 1000,
    scenarios: [],
    thresholds: {
      responseTime: { avg: 500, p95: 1000, p99: 2000 },
      throughput: { min: 10 },
      errorRate: { max: 1 },
      memory: { max: 512 },
      cpu: { max: 80 }
    },
    reporting: {
      enableDetailedLogs: true,
      enableTracing: false,
      enableProfiling: false,
      reportFormat: 'json'
    }
  } as TestConfig,

  // Load test configuration
  loadTest: {
    concurrency: 50,
    duration: 300,
    rampUpTime: 60,
    thinkTime: 500,
    scenarios: [],
    thresholds: {
      responseTime: { avg: 1000, p95: 2000, p99: 5000 },
      throughput: { min: 100 },
      errorRate: { max: 2 },
      memory: { max: 1024 },
      cpu: { max: 85 }
    },
    reporting: {
      enableDetailedLogs: false,
      enableTracing: true,
      enableProfiling: false,
      reportFormat: 'html'
    }
  } as TestConfig,

  // Stress test configuration
  stressTest: {
    concurrency: 200,
    duration: 600,
    rampUpTime: 120,
    thinkTime: 100,
    scenarios: [],
    thresholds: {
      responseTime: { avg: 2000, p95: 5000, p99: 10000 },
      throughput: { min: 50 },
      errorRate: { max: 5 },
      memory: { max: 2048 },
      cpu: { max: 95 }
    },
    reporting: {
      enableDetailedLogs: false,
      enableTracing: false,
      enableProfiling: true,
      reportFormat: 'html'
    }
  } as TestConfig
}

/**
 * Test scenario builders
 */
export class ScenarioBuilder {
  static createApiScenario(name: string, requests: TestRequest[], weight: number = 100): TestScenario {
    return {
      name,
      weight,
      requests
    }
  }

  static createAIModelTestScenario(
    modelName: string,
    provider: string,
    complexity: 'simple' | 'medium' | 'complex' = 'medium'
  ): TestScenario {
    const baseRequest = {
      method: 'POST' as const,
      url: `/api/ai/generate`,
      headers: {
        'Content-Type': 'application/json',
        'X-Provider': provider
      },
      timeout: 30000
    }

    let body: any
    let expectedResponseTime: number

    switch (complexity) {
      case 'simple':
        body = {
          model: modelName,
          prompt: 'Generate a simple hello world program',
          maxTokens: 100
        }
        expectedResponseTime = 1000
        break
      case 'complex':
        body = {
          model: modelName,
          prompt: 'Create a comprehensive e-commerce application with user authentication, product catalog, shopping cart, and payment processing',
          maxTokens: 2000,
          temperature: 0.7
        }
        expectedResponseTime = 5000
        break
      default: // medium
        body = {
          model: modelName,
          prompt: 'Build a task management application with CRUD operations',
          maxTokens: 500
        }
        expectedResponseTime = 2000
    }

    return {
      name: `${provider}-${modelName}-${complexity}`,
      weight: 100,
      requests: [{
        ...baseRequest,
        name: `${modelName}-generation`,
        body,
        expectedStatus: 200,
        thinkTime: expectedResponseTime
      }]
    }
  }

  static createDatabaseTestScenario(operation: 'read' | 'write' | 'complex', recordCount: number = 100): TestScenario {
    const baseRequest = {
      url: '/api/data',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    let request: TestRequest

    switch (operation) {
      case 'read':
        request = {
          ...baseRequest,
          name: 'database-read',
          method: 'GET',
          url: `/api/data/records?limit=${recordCount}`,
          expectedStatus: 200,
          thinkTime: 100
        }
        break
      case 'write':
        request = {
          ...baseRequest,
          name: 'database-write',
          method: 'POST',
          url: '/api/data/records',
          body: {
            data: Array.from({ length: Math.min(recordCount, 10) }, (_, i) => ({
              id: i + 1,
              name: `Record ${i + 1}`,
              value: Math.random()
            }))
          },
          expectedStatus: 201,
          thinkTime: 200
        }
        break
      default: // complex
        request = {
          ...baseRequest,
          name: 'database-complex',
          method: 'POST',
          url: '/api/data/complex-query',
          body: {
            query: {
              joins: ['users', 'projects', 'files'],
              filters: { status: 'active' },
              aggregations: ['count', 'avg', 'sum'],
              groupBy: ['category'],
              orderBy: ['created_at'],
              limit: recordCount
            }
          },
          expectedStatus: 200,
          thinkTime: 500
        }
    }

    return {
      name: `database-${operation}`,
      weight: 100,
      requests: [request]
    }
  }
}

// Factory function
export function createPerformanceTestFramework(config: Partial<TestConfig> = {}): PerformanceTestFramework {
  const defaultConfig: TestConfig = {
    concurrency: 10,
    duration: 60,
    rampUpTime: 10,
    thinkTime: 500,
    scenarios: [],
    thresholds: {
      responseTime: { avg: 1000, p95: 2000, p99: 5000 },
      throughput: { min: 10 },
      errorRate: { max: 1 },
      memory: { max: 512 },
      cpu: { max: 80 }
    },
    reporting: {
      enableDetailedLogs: true,
      enableTracing: false,
      enableProfiling: false,
      reportFormat: 'json'
    }
  }

  return new PerformanceTestFramework({ ...defaultConfig, ...config })
}