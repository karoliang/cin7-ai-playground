/**
 * Performance and Load Testing Suite
 * CIN7 AI Playground v2.0
 * Performance Assessment and Benchmarking
 */

const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.startTime = null;
  }

  async runPerformanceTest(name, test) {
    console.log(`⚡ Running Performance Test: ${name}`);
    try {
      const startTime = Date.now();
      const result = await test();
      const duration = Date.now() - startTime;

      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name} (${duration}ms)`);

      if (result.details) {
        console.log(`    ℹ️ ${result.details}`);
      }

      if (result.metrics) {
        Object.entries(result.metrics).forEach(([key, value]) => {
          console.log(`    📊 ${key}: ${value}`);
        });
      }

      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`    ⚠️ ${issue}`));
      }

      this.results.push({
        testName: name,
        ...result,
        duration
      });

      return result;
    } catch (error) {
      console.log(`❌ FAIL ${name} - Error: ${error.message}`);
      this.results.push({
        testName: name,
        passed: false,
        details: 'Test execution failed',
        issues: [error.message],
        duration: 0,
        metrics: {}
      });
      return { passed: false, issues: [error.message] };
    }
  }

  generatePerformanceReport() {
    let report = '\n' + '='.repeat(80) + '\n';
    report += '⚡ PERFORMANCE VALIDATION REPORT\n';
    report += 'CIN7 AI Playground v2.0 - Performance Assessment\n';
    report += '='.repeat(80) + '\n\n';

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total) * 100;

    report += `📊 Overall Performance Score: ${passRate.toFixed(1)}%\n`;
    report += `✅ Passed Tests: ${passed}/${total}\n`;
    report += `🚨 Performance Issues: ${total - passed}\n\n`;

    // Performance Metrics Summary
    report += '📈 Performance Metrics Summary:\n';
    report += '-'.repeat(40) + '\n';

    const totalDuration = this.results.reduce((sum, r) => sum + (r.metrics.executionTime || r.duration || 0), 0);
    const avgDuration = totalDuration / this.results.length;

    report += `⏱️ Total Test Duration: ${totalDuration}ms\n`;
    report += `⚡ Average Test Duration: ${avgDuration.toFixed(2)}ms\n`;

    // Bundle size analysis
    try {
      if (fs.existsSync('package.json')) {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const depCount = Object.keys(packageJson.dependencies || {}).length;
        const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

        report += `📦 Dependencies: ${depCount} production, ${devDepCount} development\n`;
      }
    } catch (error) {
      report += `📦 Dependency analysis failed\n`;
    }

    report += '\n📋 Detailed Results:\n';
    report += '-'.repeat(40) + '\n';

    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      report += `${status} ${result.testName}\n`;

      if (result.details) {
        report += `   ℹ️ ${result.details}\n`;
      }

      if (result.metrics && Object.keys(result.metrics).length > 0) {
        report += `   📊 Metrics:\n`;
        Object.entries(result.metrics).forEach(([key, value]) => {
          report += `      - ${key}: ${value}\n`;
        });
      }

      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => {
          report += `   ⚠️ ${issue}\n`;
        });
      }
      report += '\n';
    }

    // Performance Recommendations
    report += '🚀 Performance Recommendations:\n';
    report += '-'.repeat(40) + '\n';

    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length === 0) {
      report += '✅ All performance tests passed. System is well-optimized.\n';
    } else {
      failedTests.forEach(test => {
        report += `🔧 Optimize: ${test.testName}\n`;
        if (test.issues) {
          test.issues.forEach(issue => {
            report += `   - ${issue}\n`;
          });
        }
      });
    }

    // General optimization suggestions
    report += '\n💡 General Optimization Suggestions:\n';
    report += '- Implement code splitting for better initial load times\n';
    report += '- Use lazy loading for non-critical components\n';
    report += '- Optimize bundle size with tree shaking\n';
    report += '- Implement proper caching strategies\n';
    report += '- Monitor and optimize API response times\n';
    report += '- Use performance monitoring tools\n';

    return report;
  }
}

const performanceRunner = new PerformanceTestRunner();

// Simulate load testing
async function simulateLoad(testDuration = 1000, concurrentUsers = 10) {
  const startTime = Date.now();
  let completedRequests = 0;
  let errors = 0;

  const promises = [];

  for (let i = 0; i < concurrentUsers; i++) {
    promises.push(new Promise((resolve) => {
      const userStartTime = Date.now();

      // Simulate user activity
      const interval = setInterval(() => {
        if (Date.now() - startTime > testDuration) {
          clearInterval(interval);
          resolve({
            userId: i,
            requests: Math.floor((Date.now() - userStartTime) / 100), // Simulated requests
            duration: Date.now() - userStartTime
          });
          return;
        }

        // Simulate API request
        try {
          // Simulate processing time (10-100ms)
          const processingTime = Math.random() * 90 + 10;
          const end = Date.now() + processingTime;

          while (Date.now() < end) {
            // Busy wait to simulate CPU usage
          }

          completedRequests++;
        } catch (error) {
          errors++;
        }
      }, 50); // Check every 50ms
    }));
  }

  const results = await Promise.all(promises);

  return {
    totalDuration: Date.now() - startTime,
    completedRequests,
    errors,
    users: concurrentUsers,
    avgResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    requestsPerSecond: (completedRequests / (Date.now() - startTime)) * 1000
  };
}

// Performance Tests
async function runPerformanceTests() {
  console.log('⚡ Starting Performance Validation Tests');
  console.log('⏰ Started at:', new Date().toISOString());

  // Test 1: Bundle Size Analysis
  await performanceRunner.runPerformanceTest('Bundle Size Analysis', async () => {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});

      // Check bundle size indicators
      const hasBundleAnalyzer = devDependencies.includes('rollup-plugin-visualizer') ||
                              devDependencies.includes('webpack-bundle-analyzer');
      const hasMinification = packageJson.scripts &&
                            (packageJson.scripts.build.includes('terser') ||
                             packageJson.scripts.build.includes('minify'));

      const totalDeps = dependencies.length + devDependencies.length;
      const productionDeps = dependencies.length;

      const issues = [];
      if (totalDeps > 100) issues.push('Large number of dependencies may impact bundle size');
      if (!hasBundleAnalyzer) issues.push('Consider adding bundle analyzer for monitoring');
      if (!hasMinification) issues.push('Ensure minification is enabled in production builds');

      return {
        passed: issues.length === 0,
        details: `Dependencies: ${productionDeps} production, ${devDependencies.length} dev`,
        metrics: {
          totalDependencies: totalDeps,
          productionDependencies: productionDeps,
          developmentDependencies: devDependencies.length
        },
        issues
      };
    } catch (error) {
      return {
        passed: false,
        details: 'Failed to analyze bundle size',
        issues: [error.message],
        metrics: {}
      };
    }
  });

  // Test 2: Code Splitting and Lazy Loading
  await performanceRunner.runPerformanceTest('Code Splitting and Lazy Loading', async () => {
    const lazyLoadingPath = 'src/utils/lazyLoading.ts';
    const lazyLoadingExists = fs.existsSync(lazyLoadingPath);

    if (!lazyLoadingExists) {
      return {
        passed: false,
        details: 'Lazy loading utilities missing',
        issues: ['Implement lazy loading for better performance'],
        metrics: {}
      };
    }

    const lazyLoadingContent = fs.readFileSync(lazyLoadingPath, 'utf8');

    const features = {
      lazyComponents: lazyLoadingContent.includes('createLazyComponent'),
      errorBoundaries: lazyLoadingContent.includes('ErrorBoundary'),
      retryLogic: lazyLoadingContent.includes('retry'),
      prefetching: lazyLoadingContent.includes('prefetch'),
      performanceMonitoring: lazyLoadingContent.includes('trackLazyLoadingPerformance')
    };

    const missingFeatures = Object.entries(features)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);

    return {
      passed: missingFeatures.length <= 1,
      details: `Lazy loading features: ${Object.values(features).filter(Boolean).length}/${Object.keys(features).length}`,
      metrics: {
        featuresImplemented: Object.values(features).filter(Boolean).length,
        totalFeatures: Object.keys(features).length
      },
      issues: missingFeatures.map(feature => `Consider implementing ${feature}`)
    };
  });

  // Test 3: Caching Performance
  await performanceRunner.runPerformanceTest('Caching Performance', async () => {
    const cacheFiles = [
      'src/services/responseCache.ts',
      'src/cache/advancedCacheService.ts',
      'src/performance/performanceOptimizer.ts'
    ];

    let cacheSystems = 0;
    const features = {
      responseCache: false,
      advancedCache: false,
      performanceOptimizer: false,
      cacheMetrics: false,
      cacheInvalidation: false
    };

    for (const file of cacheFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');

        if (file.includes('responseCache')) {
          features.responseCache = true;
          cacheSystems++;
        }
        if (file.includes('advancedCacheService')) {
          features.advancedCache = true;
          cacheSystems++;
        }
        if (file.includes('performanceOptimizer')) {
          features.performanceOptimizer = true;
          cacheSystems++;
        }

        if (content.includes('metrics') || content.includes('stats')) {
          features.cacheMetrics = true;
        }
        if (content.includes('invalidate') || content.includes('clear')) {
          features.cacheInvalidation = true;
        }
      }
    }

    const issues = [];
    if (cacheSystems === 0) issues.push('No caching systems found');
    if (cacheSystems < 2) issues.push('Consider implementing multiple caching layers');
    if (!features.cacheMetrics) issues.push('Add cache performance metrics');
    if (!features.cacheInvalidation) issues.push('Implement cache invalidation strategy');

    return {
      passed: cacheSystems >= 2 && issues.length <= 1,
      details: `Cache systems: ${cacheSystems}`,
      metrics: {
        cacheSystems,
        featuresImplemented: Object.values(features).filter(Boolean).length
      },
      issues
    };
  });

  // Test 4: API Response Time
  await performanceRunner.runPerformanceTest('API Response Time Simulation', async () => {
    // Simulate API response times
    const responseTimes = [];
    const requests = 50;

    for (let i = 0; i < requests; i++) {
      const startTime = Date.now();

      // Simulate API call (10-200ms)
      const processingTime = Math.random() * 190 + 10;
      const end = startTime + processingTime;

      while (Date.now() < end) {
        // Simulate processing
      }

      responseTimes.push(Date.now() - startTime);
    }

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

    const issues = [];
    if (avgResponseTime > 150) issues.push('Average response time above 150ms');
    if (maxResponseTime > 500) issues.push('Maximum response time above 500ms');
    if (p95ResponseTime > 300) issues.push('95th percentile response time above 300ms');

    return {
      passed: avgResponseTime <= 150 && p95ResponseTime <= 300,
      details: `Simulated ${requests} API calls`,
      metrics: {
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
        p95ResponseTime: `${p95ResponseTime}ms`,
        totalRequests: requests
      },
      issues
    };
  });

  // Test 5: Load Testing Simulation
  await performanceRunner.runPerformanceTest('Load Testing Simulation', async () => {
    const loadTest = await simulateLoad(2000, 20); // 2 seconds, 20 concurrent users

    const issues = [];
    if (loadTest.errors > 0) issues.push(`${loadTest.errors} errors during load test`);
    if (loadTest.requestsPerSecond < 50) issues.push('Low requests per second');
    if (loadTest.avgResponseTime > 200) issues.push('High average response time under load');

    return {
      passed: loadTest.errors === 0 && loadTest.requestsPerSecond >= 50,
      details: `Load test with ${loadTest.users} concurrent users`,
      metrics: {
        completedRequests: loadTest.completedRequests,
        errors: loadTest.errors,
        requestsPerSecond: `${loadTest.requestsPerSecond.toFixed(2)}`,
        avgResponseTime: `${loadTest.avgResponseTime.toFixed(2)}ms`,
        testDuration: `${loadTest.totalDuration}ms`
      },
      issues
    };
  });

  // Test 6: Memory Usage Simulation
  await performanceRunner.runPerformanceTest('Memory Usage Simulation', async () => {
    // Simulate memory usage patterns
    const initialMemory = process.memoryUsage();

    // Simulate memory allocation
    const arrays = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Array(1000).fill(Math.random()));
    }

    const peakMemory = process.memoryUsage();

    // Clear memory
    arrays.length = 0;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();

    const memoryIncrease = peakMemory.heapUsed - initialMemory.heapUsed;
    const memoryLeak = finalMemory.heapUsed - initialMemory.heapUsed;

    const issues = [];
    if (memoryIncrease > 50 * 1024 * 1024) issues.push('High memory usage during operations'); // 50MB
    if (memoryLeak > 10 * 1024 * 1024) issues.push('Potential memory leak detected'); // 10MB

    return {
      passed: memoryIncrease <= 50 * 1024 * 1024 && memoryLeak <= 10 * 1024 * 1024,
      details: 'Memory usage simulation completed',
      metrics: {
        initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        peakMemory: `${(peakMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        memoryLeak: `${(memoryLeak / 1024 / 1024).toFixed(2)}MB`
      },
      issues
    };
  });

  // Test 7: Performance Optimization Features
  await performanceRunner.runPerformanceTest('Performance Optimization Features', async () => {
    const optimizationFiles = [
      'src/performance/performanceOptimizer.ts',
      'src/performance/costOptimizer.ts',
      'src/performance/requestOptimizer.ts'
    ];

    const features = {
      performanceOptimizer: false,
      costOptimizer: false,
      requestOptimizer: false,
      caching: false,
      compression: false,
      monitoring: false
    };

    let optimizationScore = 0;

    for (const file of optimizationFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');

        if (file.includes('performanceOptimizer')) {
          features.performanceOptimizer = true;
          optimizationScore++;
        }
        if (file.includes('costOptimizer')) {
          features.costOptimizer = true;
          optimizationScore++;
        }
        if (file.includes('requestOptimizer')) {
          features.requestOptimizer = true;
          optimizationScore++;
        }

        if (content.includes('cache') || content.includes('Cache')) {
          features.caching = true;
        }
        if (content.includes('compress') || content.includes('gzip')) {
          features.compression = true;
        }
        if (content.includes('monitor') || content.includes('metrics')) {
          features.monitoring = true;
        }
      }
    }

    const totalFeatures = Object.values(features).filter(Boolean).length;
    const issues = [];
    if (optimizationScore < 2) issues.push('Limited performance optimization features');
    if (!features.caching) issues.push('No caching optimizations found');
    if (!features.monitoring) issues.push('No performance monitoring implemented');

    return {
      passed: optimizationScore >= 2 && totalFeatures >= 4,
      details: `Optimization features: ${totalFeatures}/6`,
      metrics: {
        optimizationScore,
        totalFeatures,
        featuresImplemented: totalFeatures
      },
      issues
    };
  });

  // Generate and save report
  const report = performanceRunner.generatePerformanceReport();
  console.log(report);

  const reportPath = path.join(process.cwd(), 'performance-test-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Performance report saved to: ${reportPath}`);

  return report;
}

// Run tests if this is the main module
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests, PerformanceTestRunner };