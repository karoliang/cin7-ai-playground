// Health check API routes

import { NextRequest, NextResponse } from 'next/server'

// GET /api/v1/health - Health check endpoint
export const GET = async (_request: NextRequest) => {
  const startTime = Date.now()

  // Check various services and dependencies
  const healthChecks = await Promise.allSettled([
    checkDatabase(),
    checkExternalServices(),
    checkMemoryUsage(),
    checkDiskSpace()
  ])

  const results = {
    database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'unhealthy', error: 'Database connection failed' },
    external_services: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'unhealthy', error: 'External services unavailable' },
    memory: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'unhealthy', error: 'Memory check failed' },
    disk: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'unhealthy', error: 'Disk check failed' }
  }

  // Determine overall health status
  const allHealthy = Object.values(results).every(check => check.status === 'healthy')
  const hasWarnings = Object.values(results).some(check => check.status === 'warning')

  let overallStatus: 'healthy' | 'warning' | 'unhealthy' = 'healthy'
  if (!allHealthy) {
    overallStatus = 'unhealthy'
  } else if (hasWarnings) {
    overallStatus = 'warning'
  }

  const responseTime = Date.now() - startTime

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '2.0.0',
    environment: 'development',
    uptime: process.uptime(),
    response_time: responseTime,
    checks: results,
    system: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      pid: process.pid
    }
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(healthData, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overallStatus,
      'X-Response-Time': `${responseTime}ms`
    }
  })
}

// Service health check functions
async function checkDatabase(): Promise<{ status: string; response_time?: number; error?: string }> {
  const startTime = Date.now()

  try {
    // In a real implementation, check database connectivity
    // For now, we'll simulate a database check
    await new Promise(resolve => setTimeout(resolve, 10))

    const responseTime = Date.now() - startTime

    // Consider response times over 100ms as a warning
    if (responseTime > 100) {
      return {
        status: 'warning',
        response_time: responseTime,
        error: 'Database response time is slow'
      }
    }

    return {
      status: 'healthy',
      response_time: responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkExternalServices(): Promise<{ status: string; services: Record<string, any> }> {
  const services = {
    ai_service: await checkAIService(),
    storage: await checkStorageService(),
    email: await checkEmailService()
  }

  const allHealthy = Object.values(services).every(service => service.status === 'healthy')
  const hasWarnings = Object.values(services).some(service => service.status === 'warning')

  let overallStatus = 'healthy'
  if (!allHealthy) {
    overallStatus = 'unhealthy'
  } else if (hasWarnings) {
    overallStatus = 'warning'
  }

  return {
    status: overallStatus,
    services
  }
}

async function checkAIService(): Promise<{ status: string; response_time?: number; error?: string }> {
  const startTime = Date.now()

  try {
    // In a real implementation, check AI service health
    // For now, simulate the check
    await new Promise(resolve => setTimeout(resolve, 50))

    const _responseTime = Date.now() - startTime

    return {
      status: 'healthy',
      response_time: _responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'AI service unavailable'
    }
  }
}

async function checkStorageService(): Promise<{ status: string; error?: string }> {
  try {
    // In a real implementation, check storage service
    // For now, simulate the check
    await new Promise(resolve => setTimeout(resolve, 20))

    return {
      status: 'healthy'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Storage service unavailable'
    }
  }
}

async function checkEmailService(): Promise<{ status: string; error?: string }> {
  try {
    // In a real implementation, check email service
    // For now, simulate the check
    await new Promise(resolve => setTimeout(resolve, 30))

    return {
      status: 'healthy'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Email service unavailable'
    }
  }
}

async function checkMemoryUsage(): Promise<{ status: string; usage: NodeJS.MemoryUsage; error?: string }> {
  try {
    const usage = process.memoryUsage()
    const totalMemory = usage.heapTotal
    const usedMemory = usage.heapUsed
    const memoryUsagePercent = (usedMemory / totalMemory) * 100

    let status = 'healthy'
    if (memoryUsagePercent > 90) {
      status = 'unhealthy'
    } else if (memoryUsagePercent > 80) {
      status = 'warning'
    }

    return {
      status,
      usage: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Memory check failed',
      usage: process.memoryUsage()
    }
  }
}

async function checkDiskSpace(): Promise<{ status: string; error?: string }> {
  try {
    // In a real implementation, check available disk space
    // For now, simulate the check
    await new Promise(resolve => setTimeout(resolve, 10))

    return {
      status: 'healthy'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Disk space check failed'
    }
  }
}