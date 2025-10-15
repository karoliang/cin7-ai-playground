#!/usr/bin/env node

/**
 * Continuous Netlify Deployment Monitor
 *
 * Runs continuously in the background, monitoring deployments
 * and sending real-time alerts for issues.
 */

import NetlifyMonitor from './netlify-monitor.js';
import { execSync } from 'child_process';

class ContinuousMonitor extends NetlifyMonitor {
  constructor(options = {}) {
    super();
    this.interval = options.interval || 30000; // 30 seconds default
    this.alertThreshold = options.alertThreshold || 3; // 3 consecutive failures
    this.running = false;
    this.lastDeployStatus = null;
  }

  async start() {
    console.log('🔄 Starting continuous Netlify monitoring...');
    console.log(`⏰ Check interval: ${this.interval / 1000} seconds`);
    console.log(`🚨 Alert threshold: ${this.alertThreshold} consecutive failures\n`);

    this.running = true;

    // Initial check
    await this.checkAndAlert();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      if (this.running) {
        await this.checkAndAlert();
      }
    }, this.interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    console.log('✅ Continuous monitoring started. Press Ctrl+C to stop.');
  }

  async checkAndAlert() {
    try {
      const deploys = await this.getRecentDeploys(1);
      const latestDeploy = deploys[0];

      if (!latestDeploy) return;

      const currentStatus = latestDeploy.state;
      const hasChanged = this.lastDeployStatus !== currentStatus;
      this.lastDeployStatus = currentStatus;

      const timestamp = new Date().toLocaleTimeString();

      if (currentStatus === 'error') {
        console.log(`🚨 [${timestamp}] Deployment failed: ${latestDeploy.id}`);
        await this.handleFailedDeployment(latestDeploy);
      } else if (currentStatus === 'ready' && hasChanged) {
        console.log(`✅ [${timestamp}] Deployment succeeded: ${latestDeploy.id}`);
        await this.handleSuccessfulDeployment(latestDeploy);
      } else if (currentStatus === 'building') {
        console.log(`🔨 [${timestamp}] Deployment in progress: ${latestDeploy.id}`);
      }

      // Check consecutive failures
      if (this.monitoringData.consecutiveFailures >= this.alertThreshold) {
        await this.sendCriticalAlert();
      }

    } catch (error) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] Monitoring error:`, error.message);
    }
  }

  async handleFailedDeployment(deploy) {
    const analysis = this.analyzeDeployment(deploy);

    // Update monitoring data
    this.monitoringData.lastFailedDeploy = {
      id: deploy.id,
      timestamp: deploy.created_at,
      errorType: analysis.errorType,
      patterns: analysis.errorPatterns,
      message: deploy.error_message
    };
    this.saveMonitoringData();

    // Send immediate alert
    await this.sendAlert({
      type: 'deployment_failed',
      severity: 'error',
      deployId: deploy.id,
      errorType: analysis.errorType,
      message: deploy.error_message,
      suggestions: analysis.suggestions
    });
  }

  async handleSuccessfulDeployment(deploy) {
    // Reset consecutive failures
    this.monitoringData.consecutiveFailures = 0;
    this.monitoringData.lastSuccessfulDeploy = {
      id: deploy.id,
      timestamp: deploy.created_at
    };
    this.saveMonitoringData();

    // Send success notification
    await this.sendAlert({
      type: 'deployment_success',
      severity: 'success',
      deployId: deploy.id,
      url: deploy.deploy_url
    });
  }

  async sendAlert(alertData) {
    const timestamp = new Date().toISOString();

    // Log to console
    const severityIcons = {
      error: '🚨',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };

    const icon = severityIcons[alertData.severity] || 'ℹ️';
    console.log(`\n${icon} DEPLOYMENT ALERT [${timestamp}]`);
    console.log(`   Type: ${alertData.type}`);
    console.log(`   Severity: ${alertData.severity}`);

    if (alertData.deployId) {
      console.log(`   Deploy ID: ${alertData.deployId}`);
    }

    if (alertData.errorType) {
      console.log(`   Error Type: ${alertData.errorType}`);
    }

    if (alertData.message) {
      console.log(`   Message: ${alertData.message.substring(0, 200)}...`);
    }

    if (alertData.suggestions && alertData.suggestions.length > 0) {
      console.log(`   Suggestion: ${alertData.suggestions[0]}`);
    }

    if (alertData.url) {
      console.log(`   URL: ${alertData.url}`);
    }

    console.log('');

    // Save alert to log file
    await this.logAlert({ ...alertData, timestamp });
  }

  async sendCriticalAlert() {
    await this.sendAlert({
      type: 'critical_failure',
      severity: 'error',
      message: `${this.monitoringData.consecutiveFailures} consecutive deployment failures detected!`,
      suggestions: [
        'Immediately investigate recent code changes',
        'Check for breaking dependency updates',
        'Review build environment changes',
        'Consider rollback to last successful deployment'
      ]
    });
  }

  async logAlert(alertData) {
    const fs = await import('fs');
    const alertLogFile = '.netlify-alerts.json';

    try {
      let alerts = [];
      if (fs.existsSync(alertLogFile)) {
        alerts = JSON.parse(fs.readFileSync(alertLogFile, 'utf8'));
      }

      alerts.push(alertData);

      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts = alerts.slice(-100);
      }

      fs.writeFileSync(alertLogFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Failed to log alert:', error.message);
    }
  }

  stop() {
    console.log('\n🛑 Stopping continuous monitoring...');
    this.running = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('✅ Monitoring stopped.');
    process.exit(0);
  }

  async generateStatusReport() {
    console.log('\n📊 CONTINUOUS MONITORING STATUS REPORT');
    console.log('='.repeat(50));

    const siteInfo = await this.getSiteInfo();
    const deploys = await this.getRecentDeploys(5);

    console.log(`\n🌐 Site: ${siteInfo.name} (${siteInfo.url})`);
    console.log(`⏰ Last check: ${new Date().toLocaleString()}`);
    console.log(`🔄 Status: ${this.running ? 'Running' : 'Stopped'}`);
    console.log(`📈 Consecutive failures: ${this.monitoringData.consecutiveFailures}`);

    if (deploys.length > 0) {
      console.log(`\n🚀 Recent deployments:`);
      deploys.forEach((deploy, index) => {
        const status = deploy.state === 'ready' ? '✅' : deploy.state === 'error' ? '❌' : '🔨';
        const time = new Date(deploy.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${status} ${deploy.id} - ${time}`);
      });
    }

    if (this.monitoringData.lastFailedDeploy) {
      console.log(`\n❌ Last failure:`);
      console.log(`   ID: ${this.monitoringData.lastFailedDeploy.id}`);
      console.log(`   Time: ${new Date(this.monitoringData.lastFailedDeploy.timestamp).toLocaleString()}`);
      console.log(`   Type: ${this.monitoringData.lastFailedDeploy.errorType}`);
    }

    if (this.monitoringData.lastSuccessfulDeploy) {
      console.log(`\n✅ Last success:`);
      console.log(`   ID: ${this.monitoringData.lastSuccessfulDeploy.id}`);
      console.log(`   Time: ${new Date(this.monitoringData.lastSuccessfulDeploy.timestamp).toLocaleString()}`);
    }

    console.log('');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Continuous Netlify Deployment Monitor

Usage:
  node continuous-monitor.js [options]

Options:
  --interval <seconds>    Set check interval (default: 30)
  --threshold <number>    Set alert threshold for consecutive failures (default: 3)
  --status               Show current status without starting monitoring
  --help, -h             Show this help message

Examples:
  node continuous-monitor.js                           # Start with default settings
  node continuous-monitor.js --interval 60             # Check every 60 seconds
  node continuous-monitor.js --threshold 5             # Alert after 5 failures
  node continuous-monitor.js --status                  # Show current status only
    `);
    return;
  }

  const options = {};

  // Parse interval
  const intervalIndex = args.indexOf('--interval');
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    options.interval = parseInt(args[intervalIndex + 1]) * 1000;
  }

  // Parse threshold
  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    options.alertThreshold = parseInt(args[thresholdIndex + 1]);
  }

  const monitor = new ContinuousMonitor(options);

  if (args.includes('--status')) {
    await monitor.generateStatusReport();
    return;
  }

  await monitor.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ContinuousMonitor;