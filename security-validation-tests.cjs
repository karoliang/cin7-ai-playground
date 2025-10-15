/**
 * Security Validation Test Suite
 * CIN7 AI Playground v2.0
 * Comprehensive Security Assessment
 */

const fs = require('fs');
const path = require('path');

class SecurityTestRunner {
  constructor() {
    this.results = [];
  }

  async runSecurityTest(name, test) {
    console.log(`🔒 Running Security Test: ${name}`);
    try {
      const startTime = Date.now();
      const result = await test();
      const duration = Date.now() - startTime;

      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${name} (${duration}ms)`);

      if (result.details) {
        console.log(`    ℹ️ ${result.details}`);
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
        duration: 0
      });
      return { passed: false, issues: [error.message] };
    }
  }

  generateSecurityReport() {
    let report = '\n' + '='.repeat(80) + '\n';
    report += '🔒 SECURITY VALIDATION REPORT\n';
    report += 'CIN7 AI Playground v2.0 - Security Assessment\n';
    report += '='.repeat(80) + '\n\n';

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total) * 100;

    report += `📊 Overall Security Score: ${passRate.toFixed(1)}%\n`;
    report += `✅ Passed Tests: ${passed}/${total}\n`;
    report += `🚨 Security Issues: ${total - passed}\n\n`;

    report += '📋 Detailed Results:\n';
    report += '-'.repeat(40) + '\n';

    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      report += `${status} ${result.testName}\n`;

      if (result.details) {
        report += `   ℹ️ ${result.details}\n`;
      }

      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => {
          report += `   ⚠️ ${issue}\n`;
        });
      }
      report += '\n';
    }

    // Security Recommendations
    report += '🛡️ Security Recommendations:\n';
    report += '-'.repeat(40) + '\n';

    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length === 0) {
      report += '✅ All security tests passed. System appears secure.\n';
    } else {
      failedTests.forEach(test => {
        report += `🔧 Address: ${test.testName}\n`;
        if (test.issues) {
          test.issues.forEach(issue => {
            report += `   - ${issue}\n`;
          });
        }
      });
    }

    return report;
  }
}

const securityRunner = new SecurityTestRunner();

// Security Tests
async function runSecurityValidation() {
  console.log('🔒 Starting Security Validation Tests');
  console.log('⏰ Started at:', new Date().toISOString());

  // Test 1: Environment Variable Security
  await securityRunner.runSecurityTest('Environment Variable Security', async () => {
    const envExamplePath = '.env.example';
    const envExists = fs.existsSync(envExamplePath);

    if (!envExists) {
      return {
        passed: false,
        details: 'Environment example file missing',
        issues: ['Create .env.example file with proper environment variables']
      };
    }

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const hasSupabaseConfig = envContent.includes('VITE_SUPABASE_');
    const hasGLMConfig = envContent.includes('VITE_GLM_');
    const hasAPIKeys = envContent.includes('API_KEY');

    const issues = [];
    if (!hasSupabaseConfig) issues.push('Missing Supabase configuration');
    if (!hasGLMConfig) issues.push('Missing GLM configuration');
    if (!hasAPIKeys) issues.push('Missing API key configuration');

    return {
      passed: issues.length === 0,
      details: `Environment configuration: ${issues.length === 0 ? 'Complete' : 'Incomplete'}`,
      issues
    };
  });

  // Test 2: Dependency Security
  await securityRunner.runSecurityTest('Dependency Security', async () => {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const securityIssues = [];

      // Check for known vulnerable packages
      const vulnerablePackages = ['lodash', 'request', 'axios@<1.0.0'];
      for (const vuln of vulnerablePackages) {
        if (deps[vuln.split('@')[0]]) {
          securityIssues.push(`Potentially vulnerable package: ${vuln}`);
        }
      }

      // Check for security-related dependencies
      const securityDeps = ['helmet', 'dompurify', 'jsonwebtoken', 'bcrypt', 'crypto'];
      const hasSecurityDeps = securityDeps.some(dep => deps[dep]);

      if (!hasSecurityDeps) {
        securityIssues.push('Missing security dependencies (helmet, dompurify, etc.)');
      }

      return {
        passed: securityIssues.length === 0,
        details: `Dependencies analyzed: ${Object.keys(deps).length}`,
        issues: securityIssues
      };
    } catch (error) {
      return {
        passed: false,
        details: 'Failed to analyze dependencies',
        issues: [error.message]
      };
    }
  });

  // Test 3: API Security Configuration
  await securityRunner.runSecurityTest('API Security Configuration', async () => {
    const authMiddlewarePath = 'src/security/authMiddleware.ts';
    const authExists = fs.existsSync(authMiddlewarePath);

    if (!authExists) {
      return {
        passed: false,
        details: 'Authentication middleware missing',
        issues: ['Implement authentication middleware for API security']
      };
    }

    const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');

    const securityFeatures = {
      rateLimiting: authContent.includes('rateLimit') || authContent.includes('RateLimit'),
      securityHeaders: authContent.includes('securityHeaders') || authContent.includes('helmet'),
      inputValidation: authContent.includes('validateInput') || authContent.includes('validation'),
      csrfProtection: authContent.includes('csrf') || authContent.includes('CSRF')
    };

    const missingFeatures = Object.entries(securityFeatures)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);

    return {
      passed: missingFeatures.length === 0,
      details: `Security features: ${Object.values(securityFeatures).filter(Boolean).length}/${Object.keys(securityFeatures).length}`,
      issues: missingFeatures.map(feature => `Missing ${feature} in API security`)
    };
  });

  // Test 4: Input Validation Security
  await securityRunner.runSecurityTest('Input Validation Security', async () => {
    const inputValidationPath = 'src/security/inputValidation.ts';
    const validationExists = fs.existsSync(inputValidationPath);

    if (!validationExists) {
      return {
        passed: false,
        details: 'Input validation system missing',
        issues: ['Implement input validation for security']
      };
    }

    const validationContent = fs.readFileSync(inputValidationPath, 'utf8');

    const securityChecks = {
      xssProtection: validationContent.includes('sanitize') || validationContent.includes('xss'),
      sqlInjection: validationContent.includes('sql') || validationContent.includes('injection'),
      promptInjection: validationContent.includes('prompt') || validationContent.includes('injection'),
      lengthValidation: validationContent.includes('length') || validationContent.includes('max'),
      patternValidation: validationContent.includes('pattern') || validationContent.includes('regex')
    };

    const missingChecks = Object.entries(securityChecks)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);

    return {
      passed: missingChecks.length <= 1, // Allow 1 missing check
      details: `Security validations: ${Object.values(securityChecks).filter(Boolean).length}/${Object.keys(securityChecks).length}`,
      issues: missingChecks.map(check => `Consider adding ${check} protection`)
    };
  });

  // Test 5: API Key Management
  await securityRunner.runSecurityTest('API Key Management', async () => {
    const apiKeyManagerPath = 'src/security/apiKeyManager.ts';
    const managerExists = fs.existsSync(apiKeyManagerPath);

    if (!managerExists) {
      return {
        passed: false,
        details: 'API key management system missing',
        issues: ['Implement secure API key management']
      };
    }

    const managerContent = fs.readFileSync(apiKeyManagerPath, 'utf8');

    const securityFeatures = {
      encryption: managerContent.includes('encrypt') || managerContent.includes('cipher'),
      rotation: managerContent.includes('rotate') || managerContent.includes('rotation'),
      storage: managerContent.includes('storage') || managerContent.includes('secure'),
      validation: managerContent.includes('validate') || managerContent.includes('check')
    };

    const missingFeatures = Object.entries(securityFeatures)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);

    return {
      passed: missingFeatures.length <= 1,
      details: `Key management features: ${Object.values(securityFeatures).filter(Boolean).length}/${Object.keys(securityFeatures).length}`,
      issues: missingFeatures.map(feature => `Consider implementing ${feature} for API keys`)
    };
  });

  // Test 6: Error Handling Security
  await securityRunner.runSecurityTest('Error Handling Security', async () => {
    const errorFiles = [
      'src/services/errorHandler.ts',
      'src/security/inputValidation.ts',
      'src/services/aiGatewayService.ts'
    ];

    let secureErrorHandling = false;
    let sanitizedErrors = false;

    for (const file of errorFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('sanitizeErrorMessage') || content.includes('sanitize')) {
          sanitizedErrors = true;
        }
        if (content.includes('try') && content.includes('catch')) {
          secureErrorHandling = true;
        }
      }
    }

    const issues = [];
    if (!secureErrorHandling) issues.push('Missing proper error handling in services');
    if (!sanitizedErrors) issues.push('Error messages may leak sensitive information');

    return {
      passed: issues.length === 0,
      details: `Error handling: ${secureErrorHandling ? '✅' : '❌'}, Sanitization: ${sanitizedErrors ? '✅' : '❌'}`,
      issues
    };
  });

  // Test 7: CORS and Content Security
  await securityRunner.runSecurityTest('CORS and Content Security', async () => {
    const configFiles = [
      'vite.config.ts',
      'src/security/authMiddleware.ts',
      'src/api/config.ts'
    ];

    let hasCORS = false;
    let hasCSP = false;

    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('cors') || content.includes('CORS')) {
          hasCORS = true;
        }
        if (content.includes('Content-Security-Policy') || content.includes('CSP')) {
          hasCSP = true;
        }
      }
    }

    const issues = [];
    if (!hasCORS) issues.push('Missing CORS configuration');
    if (!hasCSP) issues.push('Missing Content Security Policy');

    return {
      passed: issues.length === 0,
      details: `CORS: ${hasCORS ? '✅' : '❌'}, CSP: ${hasCSP ? '✅' : '❌'}`,
      issues
    };
  });

  // Test 8: Authentication Security
  await securityRunner.runSecurityTest('Authentication Security', async () => {
    const authStorePath = 'src/stores/authStore.ts';
    const authExists = fs.existsSync(authStorePath);

    if (!authExists) {
      return {
        passed: false,
        details: 'Authentication system missing',
        issues: ['Implement authentication system']
      };
    }

    const authContent = fs.readFileSync(authStorePath, 'utf8');

    const securityFeatures = {
      sessionManagement: authContent.includes('session') || authContent.includes('token'),
      passwordHandling: authContent.includes('password') || authContent.includes('signIn'),
      errorHandling: authContent.includes('try') && authContent.includes('catch'),
      persistence: authContent.includes('persist') || authContent.includes('storage')
    };

    const missingFeatures = Object.entries(securityFeatures)
      .filter(([key, exists]) => !exists)
      .map(([key]) => key);

    return {
      passed: missingFeatures.length <= 1,
      details: `Auth security features: ${Object.values(securityFeatures).filter(Boolean).length}/${Object.keys(securityFeatures).length}`,
      issues: missingFeatures.map(feature => `Consider improving ${feature} in authentication`)
    };
  });

  // Generate and save report
  const report = securityRunner.generateSecurityReport();
  console.log(report);

  const reportPath = path.join(process.cwd(), 'security-validation-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Security report saved to: ${reportPath}`);

  return report;
}

// Run tests if this is the main module
if (require.main === module) {
  runSecurityValidation().catch(console.error);
}

module.exports = { runSecurityValidation, SecurityTestRunner };