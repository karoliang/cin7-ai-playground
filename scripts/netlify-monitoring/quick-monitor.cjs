#!/usr/bin/env node

/**
 * Quick Netlify Status Check
 * Simple monitoring script without ES module dependencies
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const CONFIG = {
  SITE_ID: '8d4a4beb-f0be-4b93-8eab-ed295d675415',
  TOKEN: 'nfp_euq2jY3pNKHe2PUHpMfPJmbsCnmrCkoQa98e'
};

function makeNetlifyAPICall(endpoint, data = null) {
  try {
    const command = data
      ? `netlify api ${endpoint} --data '${JSON.stringify(data)}' --auth=${CONFIG.TOKEN}`
      : `netlify api ${endpoint} --auth=${CONFIG.TOKEN}`;

    const output = execSync(command, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error.message);
    return null;
  }
}

function analyzeDeploymentStatus(deploys) {
  if (!deploys || deploys.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      latest: null
    };
  }

  const total = deploys.length;
  const successful = deploys.filter(d => d.state === 'ready').length;
  const failed = deploys.filter(d => d.state === 'error').length;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

  return {
    total,
    successful,
    failed,
    successRate,
    latest: deploys[0]
  };
}

function main() {
  console.log('🔍 Quick Netlify Deployment Status Check\n');

  // Get site info
  console.log('📊 Fetching site information...');
  const siteInfo = makeNetlifyAPICall('getSite', { site_id: CONFIG.SITE_ID });

  if (!siteInfo) {
    console.error('❌ Failed to fetch site information');
    process.exit(1);
  }

  console.log(`✅ Site: ${siteInfo.name} (${siteInfo.url})`);
  console.log(`🆔 Site ID: ${siteInfo.id}\n`);

  // Get recent deployments
  console.log('📋 Fetching recent deployments...');
  const deploys = makeNetlifyAPICall('listSiteDeploys', {
    site_id: CONFIG.SITE_ID,
    per_page: 5
  });

  if (!deploys) {
    console.error('❌ Failed to fetch deployments');
    process.exit(1);
  }

  console.log(`✅ Found ${deploys.length} recent deployments\n`);

  // Analyze deployment status
  const status = analyzeDeploymentStatus(deploys);

  console.log('📈 DEPLOYMENT STATUS SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total recent deployments: ${status.total}`);
  console.log(`Successful deployments: ${status.successful}`);
  console.log(`Failed deployments: ${status.failed}`);
  console.log(`Success rate: ${status.successRate}%\n`);

  // Latest deployment details
  if (status.latest) {
    const deploy = status.latest;
    const statusIcon = deploy.state === 'ready' ? '✅' :
                      deploy.state === 'error' ? '❌' : '🔨';
    const stateText = deploy.state === 'ready' ? 'SUCCESS' :
                     deploy.state === 'error' ? 'FAILED' : 'BUILDING';

    console.log('🚀 LATEST DEPLOYMENT');
    console.log('='.repeat(40));
    console.log(`${statusIcon} Status: ${stateText}`);
    console.log(`🆔 ID: ${deploy.id}`);
    console.log(`🌿 Branch: ${deploy.branch}`);
    console.log(`📅 Time: ${new Date(deploy.created_at).toLocaleString()}`);

    if (deploy.state === 'error') {
      console.log(`❌ Error: ${deploy.error_message || 'Unknown error'}`);

      // Categorize error
      const errorMsg = deploy.error_message || '';
      let errorType = 'unknown';
      if (errorMsg.includes('TypeScript') || errorMsg.includes('TS')) {
        errorType = 'typescript';
      } else if (errorMsg.includes('Build script')) {
        errorType = 'build_script';
      } else if (errorMsg.includes('dependency')) {
        errorType = 'dependency';
      }

      console.log(`🏷️  Error Type: ${errorType}`);

      // Provide suggestions
      console.log('\n💡 SUGGESTIONS:');
      if (errorType === 'typescript') {
        console.log('   • Run TypeScript locally: npm run type-check');
        console.log('   • Check for missing imports or type definitions');
        console.log('   • Verify Polaris component props are correct');
      } else if (errorType === 'build_script') {
        console.log('   • Verify build command in package.json');
        console.log('   • Check for missing dependencies: npm install');
      } else {
        console.log('   • Check Netlify build logs for detailed error information');
        console.log('   • Verify all required files are present');
      }
    }

    console.log(`\n🔗 Admin URL: ${siteInfo.admin_url}`);
    console.log(`🌐 Deploy URL: ${deploy.deploy_url || deploy.url}`);
  }

  // Save monitoring data
  const monitoringData = {
    lastChecked: new Date().toISOString(),
    deploymentStatus: status,
    siteInfo: {
      name: siteInfo.name,
      url: siteInfo.url,
      id: siteInfo.id
    }
  };

  try {
    writeFileSync('.netlify-quick-status.json', JSON.stringify(monitoringData, null, 2));
    console.log('\n📁 Monitoring data saved to .netlify-quick-status.json');
  } catch (error) {
    console.warn('Warning: Could not save monitoring data:', error.message);
  }

  console.log('\n✅ Quick status check completed!');

  // Exit with error code if latest deployment failed
  if (status.latest && status.latest.state === 'error') {
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Quick Netlify Deployment Status Check

Usage:
  node quick-monitor.js [options]

Options:
  --help, -h    Show this help message

Examples:
  node quick-monitor.js    # Check deployment status
  npm run netlify:monitor  # Check deployment status via npm script
  `);
  process.exit(0);
}

main();