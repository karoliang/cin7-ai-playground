// Simple test script to verify GLM integration
import { initializeGLMService, createGLMConfigFromEnv } from './services/glmService'

async function testGLMIntegration() {
  console.log('🚀 Testing GLM Integration...')

  try {
    // Test 1: Configuration validation
    console.log('\n📋 Test 1: Configuration validation')
    const config = createGLMConfigFromEnv()
    console.log('✅ Configuration created successfully')
    console.log(`   API Key: ${config.apiKey.substring(0, 10)}...`)
    console.log(`   Base URL: ${config.baseURL}`)
    console.log(`   Timeout: ${config.timeout}ms`)

    // Test 2: Service initialization
    console.log('\n🔧 Test 2: Service initialization')
    const glmService = initializeGLMService(config, { enableLogging: true })
    console.log('✅ GLM service initialized successfully')

    // Test 3: Health check
    console.log('\n🏥 Test 3: Health check')
    const isHealthy = await glmService.testConnection()
    if (isHealthy) {
      console.log('✅ GLM service is healthy')
    } else {
      console.log('❌ GLM service health check failed')
    }

    // Test 4: Metrics
    console.log('\n📊 Test 4: Service metrics')
    const healthStatus = glmService.getHealthStatus()
    console.log('✅ Health status:', healthStatus)

    const metrics = glmService.getRequestMetrics()
    console.log(`✅ Metrics collected: ${metrics.length} entries`)

    console.log('\n🎉 All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)

    if (error instanceof Error) {
      if (error.message.includes('VITE_GLM_API_KEY')) {
        console.log('\n💡 Tip: Make sure to set VITE_GLM_API_KEY in your .env file')
      }
    }
  }
}

// Run the test
testGLMIntegration()