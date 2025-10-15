/**
 * AI Cost Optimization Service
 * Intelligent cost management and optimization for AI API usage
 */

import { EventEmitter } from 'events'

export interface CostConfig {
  providers: {
    [provider: string]: {
      models: {
        [model: string]: {
          inputTokenCost: number // cost per 1K tokens
          outputTokenCost: number
          requestCost?: number // cost per request
          contextWindow?: number
        }
      }
      tierLimits?: {
        requestsPerMinute: number
        tokensPerMinute: number
        costPerMonth: number
      }
    }
  }
  optimization: {
    enablePromptCompression: boolean
    enableResponseCaching: boolean
    enableRequestBatching: boolean
    enableModelSelection: boolean
    enableTokenOptimization: boolean
    compressionTarget: number // target compression ratio
  }
  budgets: {
    daily: number
    weekly: number
    monthly: number
    alerts: {
      warningThreshold: number // percentage
      criticalThreshold: number
    }
  }
}

export interface TokenUsage {
  input: number
  output: number
  total: number
  cost: number
  provider: string
  model: string
  timestamp: number
  requestId: string
  userId?: string
  projectId?: string
  cached: boolean
}

export interface CostAnalysis {
  period: {
    start: number
    end: number
  }
  totalCost: number
  totalTokens: number
  totalRequests: number
  averageCostPerRequest: number
  averageTokensPerRequest: number
  byProvider: { [provider: string]: ProviderCostBreakdown }
  byModel: { [model: string]: ModelCostBreakdown }
  byUser: { [userId: string]: UserCostBreakdown }
  savings: {
    caching: number
    compression: number
    modelSelection: number
    batching: number
    total: number
  }
  projections: {
    daily: number
    weekly: number
    monthly: number
  }
}

export interface ProviderCostBreakdown {
  cost: number
  tokens: number
  requests: number
  averageLatency: number
  cacheHitRate: number
}

export interface ModelCostBreakdown {
  cost: number
  tokens: number
  requests: number
  averageCostPerToken: number
  efficiency: number // cost-efficiency score
}

export interface UserCostBreakdown {
  cost: number
  tokens: number
  requests: number
  averageCostPerRequest: number
  lastActivity: number
}

export interface CostOptimization {
  type: 'prompt' | 'model' | 'caching' | 'batching' | 'routing'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  potentialSavings: number // estimated savings in percentage
  implementation: string
  impact: string
  effort: 'low' | 'medium' | 'high'
}

export interface BudgetAlert {
  type: 'warning' | 'critical'
  threshold: number
  current: number
  projected: number
  period: 'daily' | 'weekly' | 'monthly'
  message: string
  recommendations: string[]
}

/**
 * AI Cost Optimizer Service
 */
export class CostOptimizer extends EventEmitter {
  private config: CostConfig
  private tokenUsage: TokenUsage[] = []
  private cache = new Map<string, TokenUsage>()
  private compressionCache = new Map<string, { compressed: string; ratio: number }>()
  private modelPerformance = new Map<string, { avgLatency: number; successRate: number }>()
  private userBudgets = new Map<string, { daily: number; weekly: number; monthly: number }>()
  private budgetAlerts: BudgetAlert[] = []
  private optimizationTimer: NodeJS.Timeout | null = null

  constructor(config: CostConfig) {
    super()
    this.config = config
    this.startOptimizationTimer()
  }

  /**
   * Record token usage for a request
   */
  recordUsage(usage: Omit<TokenUsage, 'cost'>): void {
    const cost = this.calculateCost(usage.provider, usage.model, usage.input, usage.output)
    const tokenUsage: TokenUsage = {
      ...usage,
      cost,
      timestamp: Date.now()
    }

    this.tokenUsage.push(tokenUsage)

    // Update cache
    if (usage.cached) {
      this.cache.set(usage.requestId, tokenUsage)
    }

    // Update model performance
    this.updateModelPerformance(usage.provider, usage.model)

    // Check budget alerts
    this.checkBudgetAlerts(usage.userId)

    // Keep only last 10000 records
    if (this.tokenUsage.length > 10000) {
      this.tokenUsage = this.tokenUsage.slice(-10000)
    }

    this.emit('usage:recorded', tokenUsage)
  }

  /**
   * Optimize a prompt before sending to AI
   */
  optimizePrompt(prompt: string, provider: string, model: string): {
    optimized: string
    compressionRatio: number
    tokenReduction: number
    optimizations: string[]
  } {
    const originalTokens = this.estimateTokens(prompt)
    let optimized = prompt
    const optimizations: string[] = []

    if (this.config.optimization.enablePromptCompression) {
      // Remove redundant whitespace
      optimized = optimized.replace(/\s+/g, ' ').trim()
      if (optimized.length < prompt.length) {
        optimizations.push('Removed redundant whitespace')
      }

      // Remove unnecessary comments and explanations
      optimized = optimized.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      optimizations.push('Removed unnecessary comments')

      // Compress repetitive patterns
      optimized = this.compressRepetitivePatterns(optimized)
      optimizations.push('Compressed repetitive patterns')

      // Optimize JSON structure
      if (optimized.includes('{') && optimized.includes('}')) {
        optimized = this.optimizeJsonStructure(optimized)
        optimizations.push('Optimized JSON structure')
      }
    }

    const optimizedTokens = this.estimateTokens(optimized)
    const compressionRatio = originalTokens > 0 ? originalTokens / optimizedTokens : 1
    const tokenReduction = originalTokens - optimizedTokens

    // Cache compression result
    const cacheKey = this.generateCompressionCacheKey(prompt)
    this.compressionCache.set(cacheKey, {
      compressed: optimized,
      ratio: compressionRatio
    })

    this.emit('prompt:optimized', {
      original: prompt.length,
      optimized: optimized.length,
      tokenReduction,
      compressionRatio
    })

    return {
      optimized,
      compressionRatio,
      tokenReduction,
      optimizations
    }
  }

  /**
   * Select the most cost-effective model for a request
   */
  selectOptimalModel(
    request: {
      prompt: string
      complexity: 'simple' | 'medium' | 'complex'
      requiresReasoning: boolean
      maxLatency?: number
      provider?: string
    },
    availableModels: string[]
  ): {
    model: string
    provider: string
    estimatedCost: number
    estimatedLatency: number
    reasoning: string
  } {
    let bestModel = availableModels[0]
    let bestProvider = request.provider || Object.keys(this.config.providers)[0]
    let bestScore = 0
    let bestReasoning = ''

    for (const provider of Object.keys(this.config.providers)) {
      if (request.provider && provider !== request.provider) continue

      for (const model of availableModels) {
        if (!this.config.providers[provider]?.models[model]) continue

        const performance = this.modelPerformance.get(`${provider}:${model}`) || {
          avgLatency: 1000,
          successRate: 0.95
        }

        const estimatedCost = this.estimateCost(provider, model, request.prompt)
        const estimatedLatency = performance.avgLatency
        const costScore = this.calculateCostScore(estimatedCost, request.complexity)
        const performanceScore = this.calculatePerformanceScore(performance, request.maxLatency)
        const complexityScore = this.calculateComplexityScore(model, request.complexity, request.requiresReasoning)

        const totalScore = (costScore * 0.4) + (performanceScore * 0.3) + (complexityScore * 0.3)

        if (totalScore > bestScore) {
          bestScore = totalScore
          bestModel = model
          bestProvider = provider
          bestReasoning = `Selected based on cost score (${costScore.toFixed(2)}), performance score (${performanceScore.toFixed(2)}), and complexity score (${complexityScore.toFixed(2)})`
        }
      }
    }

    this.emit('model:selected', {
      model: bestModel,
      provider: bestProvider,
      score: bestScore,
      reasoning: bestReasoning
    })

    return {
      model: bestModel,
      provider: bestProvider,
      estimatedCost: this.estimateCost(bestProvider, bestModel, request.prompt),
      estimatedLatency: this.modelPerformance.get(`${bestProvider}:${bestModel}`)?.avgLatency || 1000,
      reasoning: bestReasoning
    }
  }

  /**
   * Generate cost optimization recommendations
   */
  generateOptimizations(): CostOptimization[] {
    const optimizations: CostOptimization[] = []
    const analysis = this.analyzeCosts('daily')

    // Prompt optimization
    if (analysis.byProvider) {
      for (const [provider, data] of Object.entries(analysis.byProvider)) {
        if (data.cacheHitRate < 50) {
          optimizations.push({
            type: 'caching',
            priority: 'high',
            description: `Low cache hit rate (${data.cacheHitRate.toFixed(1)}%) for ${provider}`,
            potentialSavings: 30 + (50 - data.cacheHitRate),
            implementation: 'Implement semantic similarity caching for better hit rates',
            impact: 'Reduce API calls and costs by 30-50%',
            effort: 'medium'
          })
        }

        if (data.averageLatency > 3000) {
          optimizations.push({
            type: 'model',
            priority: 'medium',
            description: `High latency (${data.averageLatency.toFixed(0)}ms) for ${provider}`,
            potentialSavings: 20,
            implementation: 'Switch to faster models or implement request streaming',
            impact: 'Improve user experience and reduce opportunity costs',
            effort: 'low'
          })
        }
      }
    }

    // Model efficiency
    if (analysis.byModel) {
      const inefficientModels = Object.entries(analysis.byModel)
        .filter(([_, data]) => data.efficiency < 70)

      for (const [model, data] of inefficientModels) {
        optimizations.push({
          type: 'model',
          priority: 'medium',
          description: `Inefficient cost-to-performance ratio for ${model}`,
          potentialSavings: 25,
          implementation: 'Consider switching to more cost-effective models',
          impact: 'Reduce costs by 25% while maintaining quality',
          effort: 'low'
        })
      }
    }

    // Batch processing opportunities
    if (analysis.totalRequests > 100) {
      optimizations.push({
        type: 'batching',
        priority: 'low',
        description: 'Multiple similar requests detected',
        potentialSavings: 15,
        implementation: 'Implement request batching for similar operations',
        impact: 'Reduce API overhead and improve efficiency',
        effort: 'high'
      })
    }

    return optimizations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Analyze costs for a specific period
   */
  analyzeCosts(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): CostAnalysis {
    const now = Date.now()
    let periodMs: number

    switch (period) {
      case 'hourly': periodMs = 60 * 60 * 1000; break
      case 'daily': periodMs = 24 * 60 * 60 * 1000; break
      case 'weekly': periodMs = 7 * 24 * 60 * 60 * 1000; break
      case 'monthly': periodMs = 30 * 24 * 60 * 60 * 1000; break
    }

    const start = now - periodMs
    const relevantUsage = this.tokenUsage.filter(u => u.timestamp >= start)

    const totalCost = relevantUsage.reduce((sum, u) => sum + u.cost, 0)
    const totalTokens = relevantUsage.reduce((sum, u) => sum + u.total, 0)
    const totalRequests = relevantUsage.length

    const byProvider: { [provider: string]: ProviderCostBreakdown } = {}
    const byModel: { [model: string]: ModelCostBreakdown } = {}
    const byUser: { [userId: string]: UserCostBreakdown } = {}

    // Calculate breakdowns
    for (const usage of relevantUsage) {
      // Provider breakdown
      if (!byProvider[usage.provider]) {
        byProvider[usage.provider] = {
          cost: 0,
          tokens: 0,
          requests: 0,
          averageLatency: 0,
          cacheHitRate: 0
        }
      }
      byProvider[usage.provider].cost += usage.cost
      byProvider[usage.provider].tokens += usage.total
      byProvider[usage.provider].requests++

      // Model breakdown
      const modelKey = `${usage.provider}:${usage.model}`
      if (!byModel[modelKey]) {
        byModel[modelKey] = {
          cost: 0,
          tokens: 0,
          requests: 0,
          averageCostPerToken: 0,
          efficiency: 0
        }
      }
      byModel[modelKey].cost += usage.cost
      byModel[modelKey].tokens += usage.total
      byModel[modelKey].requests++

      // User breakdown
      if (usage.userId) {
        if (!byUser[usage.userId]) {
          byUser[usage.userId] = {
            cost: 0,
            tokens: 0,
            requests: 0,
            averageCostPerRequest: 0,
            lastActivity: 0
          }
        }
        byUser[usage.userId].cost += usage.cost
        byUser[usage.userId].tokens += usage.total
        byUser[usage.userId].requests++
        byUser[usage.userId].lastActivity = Math.max(byUser[usage.userId].lastActivity, usage.timestamp)
      }
    }

    // Calculate derived metrics
    for (const provider of Object.keys(byProvider)) {
      const data = byProvider[provider]
      data.averageLatency = this.modelPerformance.get(`${provider}:default`)?.avgLatency || 0
      const cachedRequests = relevantUsage.filter(u => u.provider === provider && u.cached).length
      data.cacheHitRate = data.requests > 0 ? (cachedRequests / data.requests) * 100 : 0
    }

    for (const model of Object.keys(byModel)) {
      const data = byModel[model]
      data.averageCostPerToken = data.tokens > 0 ? data.cost / data.tokens : 0
      data.efficiency = this.calculateModelEfficiency(model, data)
    }

    for (const user of Object.keys(byUser)) {
      const data = byUser[user]
      data.averageCostPerRequest = data.requests > 0 ? data.cost / data.requests : 0
    }

    // Calculate savings
    const savings = this.calculateSavings(relevantUsage)

    // Calculate projections
    const projections = this.calculateProjections(totalCost, period)

    return {
      period: { start, end: now },
      totalCost,
      totalTokens,
      totalRequests,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      byProvider,
      byModel,
      byUser,
      savings,
      projections
    }
  }

  /**
   * Set budget limits for a user
   */
  setUserBudget(userId: string, budgets: { daily: number; weekly: number; monthly: number }): void {
    this.userBudgets.set(userId, budgets)
    this.emit('budget:set', { userId, budgets })
  }

  /**
   * Get budget alerts
   */
  getBudgetAlerts(): BudgetAlert[] {
    return [...this.budgetAlerts]
  }

  /**
   * Clear budget alerts
   */
  clearBudgetAlerts(): void {
    this.budgetAlerts = []
    this.emit('alerts:cleared')
  }

  /**
   * Get cost optimization statistics
   */
  getStats(): {
    totalSaved: number
    compressionRatio: number
    cacheHitRate: number
    averageCostPerRequest: number
    mostExpensiveProvider: string
    mostEfficientModel: string
  } {
    const analysis = this.analyzeCosts('daily')
    const compressionRatio = this.calculateAverageCompressionRatio()

    let mostExpensiveProvider = ''
    let highestCost = 0
    let mostEfficientModel = ''
    let highestEfficiency = 0

    for (const [provider, data] of Object.entries(analysis.byProvider)) {
      if (data.cost > highestCost) {
        highestCost = data.cost
        mostExpensiveProvider = provider
      }
    }

    for (const [model, data] of Object.entries(analysis.byModel)) {
      if (data.efficiency > highestEfficiency) {
        highestEfficiency = data.efficiency
        mostEfficientModel = model
      }
    }

    return {
      totalSaved: analysis.savings.total,
      compressionRatio,
      cacheHitRate: Object.values(analysis.byProvider).reduce((sum, data) => sum + data.cacheHitRate, 0) / Object.keys(analysis.byProvider).length,
      averageCostPerRequest: analysis.averageCostPerRequest,
      mostExpensiveProvider,
      mostEfficientModel
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer)
      this.optimizationTimer = null
    }

    this.tokenUsage = []
    this.cache.clear()
    this.compressionCache.clear()
    this.modelPerformance.clear()
    this.userBudgets.clear()
    this.budgetAlerts = []
    this.removeAllListeners()
  }

  // Private methods

  private calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const providerConfig = this.config.providers[provider]
    if (!providerConfig || !providerConfig.models[model]) return 0

    const modelConfig = providerConfig.models[model]
    const inputCost = (inputTokens / 1000) * modelConfig.inputTokenCost
    const outputCost = (outputTokens / 1000) * modelConfig.outputTokenCost
    const requestCost = modelConfig.requestCost || 0

    return inputCost + outputCost + requestCost
  }

  private estimateCost(provider: string, model: string, prompt: string): number {
    const tokens = this.estimateTokens(prompt)
    return this.calculateCost(provider, model, tokens, tokens * 0.3) // Estimate 30% output tokens
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private calculateCostScore(cost: number, complexity: string): number {
    let maxCost = 0.01
    if (complexity === 'medium') maxCost = 0.05
    if (complexity === 'complex') maxCost = 0.10

    return Math.max(0, 100 - ((cost / maxCost) * 100))
  }

  private calculatePerformanceScore(performance: { avgLatency: number; successRate: number }, maxLatency?: number): number {
    const latencyScore = maxLatency ? Math.max(0, 100 - ((performance.avgLatency / maxLatency) * 100)) : 50
    const successScore = performance.successRate * 100
    return (latencyScore + successScore) / 2
  }

  private calculateComplexityScore(model: string, complexity: string, requiresReasoning: boolean): number {
    // Simple heuristic for model complexity matching
    if (complexity === 'simple') return model.includes('flash') || model.includes('fast') ? 100 : 70
    if (complexity === 'medium') return model.includes('turbo') || model.includes('standard') ? 100 : 80
    if (complexity === 'complex') return model.includes('pro') || model.includes('plus') ? 100 : 60

    return requiresReasoning ? 80 : 60
  }

  private compressRepetitivePatterns(text: string): string {
    // Simple pattern compression - replace repetitive content with references
    const patterns = [
      { pattern: /You are an AI assistant\./g, replacement: '[AI_ROLE]' },
      { pattern: /Please provide\./g, replacement: '[REQUEST]' },
      { pattern: /Thank you for your help\./g, replacement: '[THANKS]' }
    ]

    let compressed = text
    for (const { pattern, replacement } of patterns) {
      compressed = compressed.replace(pattern, replacement)
    }

    return compressed
  }

  private optimizeJsonStructure(jsonStr: string): string {
    try {
      const obj = JSON.parse(jsonStr)
      // Remove null values and empty arrays
      const optimized = JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === null || (Array.isArray(value) && value.length === 0)) {
          return undefined
        }
        return value
      }))
      return JSON.stringify(optimized)
    } catch {
      return jsonStr
    }
  }

  private generateCompressionCacheKey(prompt: string): string {
    return Buffer.from(prompt).toString('base64').substring(0, 32)
  }

  private updateModelPerformance(provider: string, model: string): void {
    const key = `${provider}:${model}`
    const existing = this.modelPerformance.get(key) || { avgLatency: 1000, successRate: 0.95 }

    // In a real implementation, this would update based on actual performance metrics
    // For now, we'll use placeholder values
    this.modelPerformance.set(key, existing)
  }

  private calculateModelEfficiency(model: string, data: ModelCostBreakdown): number {
    // Efficiency score based on cost per token and success rate
    const costEfficiency = Math.max(0, 100 - (data.averageCostPerToken * 1000))
    const requestEfficiency = Math.min(100, data.requests * 10) // More requests = better efficiency
    return (costEfficiency + requestEfficiency) / 2
  }

  private calculateSavings(usage: TokenUsage[]): {
    caching: number
    compression: number
    modelSelection: number
    batching: number
    total: number
  } {
    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0)
    const cachedCost = usage.filter(u => u.cached).reduce((sum, u) => sum + u.cost, 0)

    const compressionRatio = this.calculateAverageCompressionRatio()
    const compressionSavings = totalCost * (1 - 1 / compressionRatio)

    const cachingSavings = cachedCost * 0.9 // Assume 90% savings for cached requests
    const modelSelectionSavings = totalCost * 0.1 // Assume 10% savings from optimal model selection
    const batchingSavings = totalCost * 0.05 // Assume 5% savings from batching

    return {
      caching: cachingSavings,
      compression: compressionSavings,
      modelSelection: modelSelectionSavings,
      batching: batchingSavings,
      total: cachingSavings + compressionSavings + modelSelectionSavings + batchingSavings
    }
  }

  private calculateProjections(currentCost: number, period: 'hourly' | 'daily' | 'weekly' | 'monthly'): {
    daily: number
    weekly: number
    monthly: number
  } {
    let multiplier: number
    switch (period) {
      case 'hourly': multiplier = 24; break
      case 'daily': multiplier = 1; break
      case 'weekly': multiplier = 1/7; break
      case 'monthly': multiplier = 1/30; break
    }

    const dailyCost = currentCost * multiplier
    return {
      daily: dailyCost,
      weekly: dailyCost * 7,
      monthly: dailyCost * 30
    }
  }

  private calculateAverageCompressionRatio(): number {
    if (this.compressionCache.size === 0) return 1

    const ratios = Array.from(this.compressionCache.values()).map(data => data.ratio)
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length
  }

  private checkBudgetAlerts(userId?: string): void {
    if (!userId) return

    const userBudget = this.userBudgets.get(userId)
    if (!userBudget) return

    const analysis = this.analyzeCosts('daily')
    const userUsage = analysis.byUser[userId]

    if (!userUsage) return

    // Check daily budget
    const dailyUsagePercent = (userUsage.cost / userBudget.daily) * 100
    if (dailyUsagePercent > this.config.budgets.alerts.criticalThreshold) {
      this.addBudgetAlert({
        type: 'critical',
        threshold: this.config.budgets.alerts.criticalThreshold,
        current: dailyUsagePercent,
        projected: dailyUsagePercent * 1.2,
        period: 'daily',
        message: `Daily budget exceeded by ${dailyUsagePercent.toFixed(1)}%`,
        recommendations: [
          'Reduce AI usage for non-critical tasks',
          'Enable more aggressive caching',
          'Use less expensive models where possible'
        ]
      })
    } else if (dailyUsagePercent > this.config.budgets.alerts.warningThreshold) {
      this.addBudgetAlert({
        type: 'warning',
        threshold: this.config.budgets.alerts.warningThreshold,
        current: dailyUsagePercent,
        projected: dailyUsagePercent * 1.2,
        period: 'daily',
        message: `Daily budget usage at ${dailyUsagePercent.toFixed(1)}%`,
        recommendations: [
          'Monitor usage closely',
          'Consider cost optimization measures'
        ]
      })
    }
  }

  private addBudgetAlert(alert: BudgetAlert): void {
    // Avoid duplicate alerts
    const exists = this.budgetAlerts.some(a =>
      a.type === alert.type && a.period === alert.period && a.message === alert.message
    )

    if (!exists) {
      this.budgetAlerts.push(alert)
      this.emit('budget:alert', alert)
    }
  }

  private startOptimizationTimer(): void {
    // Run optimization analysis every 10 minutes
    this.optimizationTimer = setInterval(() => {
      const optimizations = this.generateOptimizations()
      if (optimizations.length > 0) {
        this.emit('optimizations:available', optimizations)
      }
    }, 10 * 60 * 1000)
  }
}

// Factory function
export function createCostOptimizer(config: Partial<CostConfig> = {}): CostOptimizer {
  const defaultConfig: CostConfig = {
    providers: {
      glm: {
        models: {
          'glm-4': {
            inputTokenCost: 0.001,
            outputTokenCost: 0.002,
            contextWindow: 128000
          },
          'glm-4-flash': {
            inputTokenCost: 0.0005,
            outputTokenCost: 0.001,
            contextWindow: 128000
          }
        }
      }
    },
    optimization: {
      enablePromptCompression: true,
      enableResponseCaching: true,
      enableRequestBatching: true,
      enableModelSelection: true,
      enableTokenOptimization: true,
      compressionTarget: 0.7
    },
    budgets: {
      daily: 10,
      weekly: 50,
      monthly: 200,
      alerts: {
        warningThreshold: 70,
        criticalThreshold: 90
      }
    }
  }

  return new CostOptimizer({ ...defaultConfig, ...config })
}