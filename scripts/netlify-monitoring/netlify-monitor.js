#!/usr/bin/env node

/**
 * Netlify Deployment Monitor
 *
 * A comprehensive deployment monitoring tool that provides real-time status,
 * error detection, and automated reporting for Netlify deployments.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const CONFIG = {
  SITE_ID: '8d4a4beb-f0be-4b93-8eab-ed295d675415',
  NETLIFY_TOKEN: 'nfp_euq2jY3pNKHe2PUHpMfPJmbsCnmrCkoQa98e',
  MONITORING_FILE: '.netlify-monitoring.json',
  ERROR_LOG_FILE: '.netlify-error-log.json',
  SUCCESS_LOG_FILE: '.netlify-success-log.json'
};

class NetlifyMonitor {
  constructor() {
    this.siteId = CONFIG.SITE_ID;
    this.token = CONFIG.NETLIFY_TOKEN;
    this.monitoringData = this.loadMonitoringData();
  }

  loadMonitoringData() {
    try {
      if (existsSync(CONFIG.MONITORING_FILE)) {
        return JSON.parse(readFileSync(CONFIG.MONITORING_FILE, 'utf8'));
      }
    } catch (error) {
      console.warn('Warning: Could not load monitoring data, starting fresh');
    }
    return {
      lastChecked: null,
      lastSuccessfulDeploy: null,
      lastFailedDeploy: null,
      consecutiveFailures: 0,
      totalDeploys: 0,
      errorPatterns: {},
      firstCheck: new Date().toISOString()
    };
  }

  saveMonitoringData() {
    try {
      writeFileSync(CONFIG.MONITORING_FILE, JSON.stringify(this.monitoringData, null, 2));
    } catch (error) {
      console.error('Error saving monitoring data:', error.message);
    }
  }

  async makeApiCall(endpoint, data = null) {
    try {
      const command = data
        ? `netlify api ${endpoint} --data '${JSON.stringify(data)}' --auth=${this.token}`
        : `netlify api ${endpoint} --auth=${this.token}`;

      const output = execSync(command, { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async getSiteInfo() {
    return await this.makeApiCall('getSite', { site_id: this.siteId });
  }

  async getRecentDeploys(limit = 10) {
    return await this.makeApiCall('listSiteDeploys', {
      site_id: this.siteId,
      per_page: limit
    });
  }

  async getRecentBuilds(limit = 5) {
    return await this.makeApiCall('listSiteBuilds', {
      site_id: this.siteId,
      per_page: limit
    });
  }

  analyzeDeployment(deploy) {
    const analysis = {
      id: deploy.id,
      state: deploy.state,
      created_at: deploy.created_at,
      updated_at: deploy.updated_at,
      commit_ref: deploy.commit_ref,
      branch: deploy.branch,
      title: deploy.title,
      hasError: deploy.state === 'error',
      errorType: null,
      errorPatterns: [],
      suggestions: []
    };

    if (analysis.hasError && deploy.error_message) {
      analysis.errorType = this.categorizeError(deploy.error_message);
      analysis.errorPatterns = this.extractErrorPatterns(deploy.error_message);
      analysis.suggestions = this.generateSuggestions(analysis.errorType, deploy.error_message);
    }

    return analysis;
  }

  categorizeError(errorMessage) {
    if (errorMessage.includes('TypeScript') || errorMessage.includes('TS')) {
      return 'typescript';
    } else if (errorMessage.includes('Build script') || errorMessage.includes('exit code')) {
      return 'build_script';
    } else if (errorMessage.includes('dependency') || errorMessage.includes('npm')) {
      return 'dependency';
    } else if (errorMessage.includes('permission') || errorMessage.includes('auth')) {
      return 'permission';
    } else {
      return 'unknown';
    }
  }

  extractErrorPatterns(errorMessage) {
    const patterns = [];

    // Extract TypeScript errors
    const tsErrors = errorMessage.match(/error TS\d+:\s[^\\n]*/g);
    if (tsErrors) {
      patterns.push(...tsErrors.map(err => err.trim()));
    }

    // Extract file paths with errors
    const fileErrors = errorMessage.match(/src\/[^\\n]*\([^)]*\):/g);
    if (fileErrors) {
      patterns.push(...fileErrors);
    }

    // Extract common error patterns
    const commonPatterns = [
      { pattern: /Property '[^']*' does not exist/, type: 'property_access' },
      { pattern: /Property '[^']*' is missing/, type: 'missing_property' },
      { pattern: /Type '[^']*' is not assignable/, type: 'type_mismatch' },
      { pattern: /Cannot find name '[^']*'/, type: 'undefined_name' }
    ];

    commonPatterns.forEach(({ pattern, type }) => {
      if (pattern.test(errorMessage)) {
        patterns.push(type);
      }
    });

    return patterns;
  }

  generateSuggestions(errorType, errorMessage) {
    const suggestions = [];

    switch (errorType) {
      case 'typescript':
        suggestions.push('Run TypeScript locally: npm run type-check');
        suggestions.push('Check for missing imports or type definitions');
        suggestions.push('Verify Polaris component props are correct');
        break;
      case 'build_script':
        suggestions.push('Verify build command in package.json');
        suggestions.push('Check for missing dependencies: npm install');
        break;
      case 'dependency':
        suggestions.push('Run npm install to update dependencies');
        suggestions.push('Check package.json for version conflicts');
        break;
      case 'permission':
        suggestions.push('Check Netlify authentication: netlify status');
        suggestions.push('Verify site permissions and access token');
        break;
      default:
        suggestions.push('Check Netlify build logs for detailed error information');
        suggestions.push('Verify all required files are present');
    }

    return suggestions;
  }

  async monitorDeployment() {
    console.log('🔍 Starting Netlify deployment monitoring...\n');

    try {
      // Get site information
      const siteInfo = await this.getSiteInfo();
      console.log(`📊 Site: ${siteInfo.name} (${siteInfo.url})`);
      console.log(`🆔 Site ID: ${siteInfo.id}\n`);

      // Get recent deployments
      const deploys = await this.getRecentDeploys();
      const builds = await this.getRecentBuilds();

      console.log(`📋 Found ${deploys.length} recent deployments`);
      console.log(`🔨 Found ${builds.length} recent builds\n`);

      // Analyze deployments
      const analyses = deploys.map(deploy => this.analyzeDeployment(deploy));

      // Update monitoring data
      this.updateMonitoringData(analyses);

      // Generate report
      this.generateReport(analyses, siteInfo);

      // Save monitoring data
      this.monitoringData.lastChecked = new Date().toISOString();
      this.saveMonitoringData();

      console.log('\n✅ Monitoring complete!');

    } catch (error) {
      console.error('\n❌ Monitoring failed:', error.message);
      process.exit(1);
    }
  }

  updateMonitoringData(analyses) {
    this.monitoringData.totalDeploys += analyses.length;

    const latestDeploy = analyses[0];
    if (latestDeploy) {
      if (latestDeploy.hasError) {
        this.monitoringData.lastFailedDeploy = {
          id: latestDeploy.id,
          timestamp: latestDeploy.created_at,
          errorType: latestDeploy.errorType,
          patterns: latestDeploy.errorPatterns
        };
        this.monitoringData.consecutiveFailures++;
      } else {
        this.monitoringData.lastSuccessfulDeploy = {
          id: latestDeploy.id,
          timestamp: latestDeploy.created_at
        };
        this.monitoringData.consecutiveFailures = 0;
      }
    }

    // Update error patterns
    analyses.forEach(analysis => {
      if (analysis.hasError) {
        analysis.errorPatterns.forEach(pattern => {
          this.monitoringData.errorPatterns[pattern] =
            (this.monitoringData.errorPatterns[pattern] || 0) + 1;
        });
      }
    });
  }

  generateReport(analyses, siteInfo) {
    console.log('📈 DEPLOYMENT MONITORING REPORT');
    console.log('='.repeat(50));

    // Overall statistics
    const totalDeploys = analyses.length;
    const successfulDeploys = analyses.filter(a => !a.hasError).length;
    const failedDeploys = analyses.filter(a => a.hasError).length;
    const successRate = totalDeploys > 0 ? ((successfulDeploys / totalDeploys) * 100).toFixed(1) : 0;

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Total Deploys: ${this.monitoringData.totalDeploys}`);
    console.log(`   Recent Deploys: ${totalDeploys}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Consecutive Failures: ${this.monitoringData.consecutiveFailures}`);

    // Latest deployment status
    const latestDeploy = analyses[0];
    if (latestDeploy) {
      const status = latestDeploy.hasError ? '❌ FAILED' : '✅ SUCCESS';
      console.log(`\n🚀 Latest Deployment: ${status}`);
      console.log(`   ID: ${latestDeploy.id}`);
      console.log(`   Branch: ${latestDeploy.branch}`);
      console.log(`   Time: ${new Date(latestDeploy.created_at).toLocaleString()}`);

      if (latestDeploy.hasError) {
        console.log(`   Error Type: ${latestDeploy.errorType}`);
        console.log(`   Error Message: ${latestDeploy.title}`);
      }
    }

    // Error patterns analysis
    if (Object.keys(this.monitoringData.errorPatterns).length > 0) {
      console.log(`\n🔍 Common Error Patterns:`);
      Object.entries(this.monitoringData.errorPatterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([pattern, count]) => {
          console.log(`   ${pattern}: ${count} occurrences`);
        });
    }

    // Recent failures
    const recentFailures = analyses.filter(a => a.hasError).slice(0, 3);
    if (recentFailures.length > 0) {
      console.log(`\n❌ Recent Failures:`);
      recentFailures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.id} - ${failure.errorType}`);
        console.log(`      ${failure.title}`);
        if (failure.suggestions.length > 0) {
          console.log(`      💡 Suggestion: ${failure.suggestions[0]}`);
        }
      });
    }

    // Recommendations
    this.generateRecommendations();

    // Save detailed logs
    this.saveDetailedLogs(analyses);
  }

  generateRecommendations() {
    console.log(`\n💡 Recommendations:`);

    if (this.monitoringData.consecutiveFailures >= 3) {
      console.log('   ⚠️  HIGH PRIORITY: Multiple consecutive failures detected');
      console.log('      → Consider reviewing recent changes');
      console.log('      → Run full build test locally');
    }

    const errorPatterns = this.monitoringData.errorPatterns;
    if (errorPatterns['missing_property'] > 5) {
      console.log('   🔧 Address missing properties errors');
      console.log('      → Check Polaris component prop requirements');
    }

    if (errorPatterns['type_mismatch'] > 5) {
      console.log('   🔧 Fix TypeScript type mismatches');
      console.log('      → Update type definitions');
    }

    if (this.monitoringData.consecutiveFailures === 0) {
      console.log('   ✅ All deployments are working correctly!');
    }
  }

  saveDetailedLogs(analyses) {
    try {
      const successfulDeploys = analyses.filter(a => !a.hasError);
      const failedDeploys = analyses.filter(a => a.hasError);

      if (successfulDeploys.length > 0) {
        writeFileSync(CONFIG.SUCCESS_LOG_FILE, JSON.stringify(successfulDeploys, null, 2));
      }

      if (failedDeploys.length > 0) {
        writeFileSync(CONFIG.ERROR_LOG_FILE, JSON.stringify(failedDeploys, null, 2));
      }

      console.log(`\n📁 Detailed logs saved:`);
      if (successfulDeploys.length > 0) {
        console.log(`   ✅ Successes: ${CONFIG.SUCCESS_LOG_FILE}`);
      }
      if (failedDeploys.length > 0) {
        console.log(`   ❌ Errors: ${CONFIG.ERROR_LOG_FILE}`);
      }
    } catch (error) {
      console.error('Error saving detailed logs:', error.message);
    }
  }

  async triggerManualDeploy() {
    console.log('🚀 Triggering manual deployment...');

    try {
      const result = await this.makeApiCall('createSiteDeploy', {
        site_id: this.siteId,
        branch: 'main'
      });

      console.log(`✅ Deployment triggered: ${result.id}`);
      console.log(`📊 Monitor progress at: ${result.admin_url}`);

      return result;
    } catch (error) {
      console.error('❌ Failed to trigger deployment:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const monitor = new NetlifyMonitor();

  if (args.includes('--trigger-deploy')) {
    await monitor.triggerManualDeploy();
    // Wait a moment before monitoring
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Netlify Deployment Monitor

Usage:
  node netlify-monitor.js [options]

Options:
  --trigger-deploy    Trigger a new deployment before monitoring
  --help, -h          Show this help message

Examples:
  node netlify-monitor.js                    # Monitor current status
  node netlify-monitor.js --trigger-deploy   # Deploy and monitor
    `);
    return;
  }

  await monitor.monitorDeployment();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default NetlifyMonitor;