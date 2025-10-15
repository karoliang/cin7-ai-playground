#!/usr/bin/env node

/**
 * Netlify Error Detection and Auto-Fixer
 *
 * Analyzes deployment errors and attempts to automatically fix common issues.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ErrorFixer {
  constructor() {
    this.projectRoot = join(__dirname, '../..');
    this.commonFixes = {
      'missing_property': this.fixMissingProperty.bind(this),
      'type_mismatch': this.fixTypeMismatch.bind(this),
      'undefined_name': this.fixUndefinedName.bind(this),
      'property_access': this.fixPropertyAccess.bind(this)
    };
  }

  async analyzeAndFix() {
    console.log('🔧 Analyzing deployment errors and attempting fixes...\n');

    try {
      // Load error data
      const errorData = this.loadErrorData();
      if (!errorData || errorData.length === 0) {
        console.log('✅ No recent deployment errors found.');
        return;
      }

      console.log(`📋 Found ${errorData.length} recent deployment errors`);

      // Analyze and fix each error
      let fixesApplied = 0;
      for (const error of errorData) {
        const fixes = await this.analyzeError(error);
        if (fixes.length > 0) {
          console.log(`\n🔧 Analyzing error: ${error.id}`);
          console.log(`   Type: ${error.errorType}`);
          console.log(`   Message: ${error.title}`);

          for (const fix of fixes) {
            const success = await this.applyFix(fix);
            if (success) {
              fixesApplied++;
              console.log(`   ✅ Applied fix: ${fix.description}`);
            } else {
              console.log(`   ❌ Failed to apply fix: ${fix.description}`);
            }
          }
        }
      }

      if (fixesApplied > 0) {
        console.log(`\n🎉 Successfully applied ${fixesApplied} automated fixes!`);
        console.log('💡 Consider running a new deployment to test the fixes.');
      } else {
        console.log('\n⚠️  No automated fixes available for these errors.');
        console.log('💡 Manual intervention may be required.');
      }

    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
    }
  }

  loadErrorData() {
    const errorLogFile = join(this.projectRoot, '.netlify-error-log.json');
    try {
      if (existsSync(errorLogFile)) {
        return JSON.parse(readFileSync(errorLogFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Warning: Could not load error log file');
    }
    return [];
  }

  async analyzeError(error) {
    const fixes = [];

    if (!error.errorType) {
      return fixes;
    }

    // Apply pattern-specific fixes
    if (this.commonFixes[error.errorType]) {
      const patternFixes = await this.commonFixes[error.errorType](error);
      fixes.push(...patternFixes);
    }

    // Generic fixes based on error message
    if (error.message) {
      const genericFixes = await this.applyGenericFixes(error);
      fixes.push(...genericFixes);
    }

    return fixes;
  }

  async fixMissingProperty(error) {
    const fixes = [];

    if (error.message && error.message.includes("Property 'as' is missing")) {
      fixes.push({
        type: 'add_as_prop_to_text',
        description: 'Add missing "as" prop to Text components',
        files: this.findFilesWithTextComponents(),
        apply: this.fixTextComponents.bind(this)
      });
    }

    if (error.message && error.message.includes("Property 'autoComplete' is missing")) {
      fixes.push({
        type: 'add_autocomplete_to_textfield',
        description: 'Add missing "autoComplete" prop to TextField components',
        files: this.findFilesWithTextFields(),
        apply: this.fixTextFieldComponents.bind(this)
      });
    }

    return fixes;
  }

  async fixTypeMismatch(error) {
    const fixes = [];

    if (error.message && error.message.includes("Type 'string' is not assignable to type")) {
      fixes.push({
        type: 'fix_type_mismatch',
        description: 'Fix TypeScript type mismatches',
        files: this.findFilesWithTypeErrors(),
        apply: this.fixTypeErrors.bind(this)
      });
    }

    return fixes;
  }

  async fixUndefinedName(error) {
    const fixes = [];

    if (error.message && error.message.includes("Cannot find name")) {
      fixes.push({
        type: 'fix_imports',
        description: 'Fix missing imports and undefined names',
        files: this.findFilesWithImportErrors(),
        apply: this.fixImportErrors.bind(this)
      });
    }

    return fixes;
  }

  async fixPropertyAccess(error) {
    const fixes = [];

    if (error.message && error.message.includes("Property 'Section' does not exist")) {
      fixes.push({
        type: 'fix_card_sections',
        description: 'Remove deprecated Card.Section usage',
        files: this.findFilesWithCardSections(),
        apply: this.fixCardSections.bind(this)
      });
    }

    if (error.message && error.message.includes("Property 'Stack' does not exist")) {
      fixes.push({
        type: 'fix_stack_imports',
        description: 'Fix Stack component imports and usage',
        files: this.findFilesWithStackUsage(),
        apply: this.fixStackUsage.bind(this)
      });
    }

    return fixes;
  }

  async applyGenericFixes(error) {
    const fixes = [];

    // Check for Polaris-related issues
    if (error.message && error.message.includes('Polaris')) {
      fixes.push({
        type: 'update_polaris_imports',
        description: 'Update Polaris component imports and usage',
        files: this.findFilesWithPolarisImports(),
        apply: this.fixPolarisImports.bind(this)
      });
    }

    // Check for Next.js build issues
    if (error.message && error.message.includes('Next.js')) {
      fixes.push({
        type: 'fix_nextjs_config',
        description: 'Fix Next.js configuration issues',
        files: ['next.config.js', 'package.json'],
        apply: this.fixNextJSConfig.bind(this)
      });
    }

    return fixes;
  }

  // File finding methods
  findFilesWithTextComponents() {
    try {
      const result = execSync('grep -r "Text variant" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithTextFields() {
    try {
      const result = execSync('grep -r "TextField" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithCardSections() {
    try {
      const result = execSync('grep -r "Card\\.Section" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithStackUsage() {
    try {
      const result = execSync('grep -r "from.*Stack\\|import.*Stack" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithPolarisImports() {
    try {
      const result = execSync('grep -r "@shopify/polaris" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithTypeErrors() {
    try {
      const result = execSync('grep -r "Type.*is not assignable" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  findFilesWithImportErrors() {
    try {
      const result = execSync('grep -r "Cannot find name" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });
      return result.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  // Fix implementation methods
  async fixTextComponents(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Add missing "as" prop to Text components
      content = content.replace(
        /<Text variant="([^"]+)"([^>]*?)>/g,
        '<Text variant="$1" as="p"$2>'
      );

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixTextFieldComponents(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Add missing autoComplete prop to TextField components
      content = content.replace(
        /<TextField([^>]*?)(?!autoComplete)([^>]*?)>/g,
        (match, before, after) => {
          if (match.includes('autoComplete')) return match;
          return `<TextField${before} autoComplete="off"${after}>`;
        }
      );

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixCardSections(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Replace Card.Section with proper structure
      content = content.replace(/<Card\.Section([^>]*)>/g, '<div$1>');
      content = content.replace(/<\/Card\.Section>/g, '</div>');

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixStackUsage(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Replace deprecated Stack with InlineStack/BlockStack
      content = content.replace(/import.*Stack.*from ['"]@shopify\/polaris['"]/,
        "import { InlineStack, BlockStack } from '@shopify/polaris'");
      content = content.replace(/<Stack([^>]*vertical[^>]*)>/g, '<BlockStack$1>');
      content = content.replace(/<Stack([^>]*)>/g, '<InlineStack$1>');
      content = content.replace(/<\/Stack>/g, '</InlineStack>');

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixPolarisImports(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Common Polaris v13 fixes
      const fixes = [
        { from: 'Stack', to: 'InlineStack, BlockStack' },
        { from: 'ChartBarIcon', to: 'ChartVerticalIcon' },
        { from: 'CircleIcon', to: 'CircleRightIcon' },
        { from: 'AlertIcon', to: 'AlertCircleIcon' },
        { from: 'CurrencyDollarIcon', to: 'CashDollarIcon' },
        { from: 'DevicePhoneIcon', to: 'PhoneIcon' },
        { from: 'AnalyticsIcon', to: 'ChartLineIcon' },
        { from: 'AddCircleIcon', to: 'PlusCircleIcon' },
        { from: 'ChatBubbleIcon', to: 'ChatIcon' }
      ];

      fixes.forEach(({ from, to }) => {
        const importRegex = new RegExp(`import.*${from}.*from\\s+['"]@shopify\\/polaris['"]`, 'g');
        content = content.replace(importRegex, `import { ${to} } from '@shopify/polaris'`);
      });

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixTypeErrors(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // Common type fixes
      content = content.replace(/tone: "white"/g, 'tone: "magic-subtle"');
      content = content.replace(/variant: "system"/g, 'variant: "auto"');
      content = content.replace(/destructive: true/g, 'tone: "critical"');

      writeFileSync(fullPath, content);
      return true;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixImportErrors(filePath) {
    const fullPath = join(this.projectRoot, filePath);
    try {
      let content = readFileSync(fullPath, 'utf8');

      // This would need more sophisticated analysis for actual implementation
      // For now, just log that manual intervention is needed
      console.log(`   ⚠️  Manual import fix needed for: ${filePath}`);

      return false;
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
      return false;
    }
  }

  async fixNextJSConfig(filePath) {
    // This would handle Next.js specific issues
    console.log(`   ⚠️  Next.js config fix needed for: ${filePath}`);
    return false;
  }

  async applyFix(fix) {
    if (!fix.files || fix.files.length === 0) {
      return false;
    }

    let successCount = 0;
    for (const file of fix.files) {
      const success = await fix.apply(file);
      if (success) {
        successCount++;
      }
    }

    return successCount > 0;
  }

  async runTypeCheck() {
    console.log('\n🔍 Running TypeScript type check to validate fixes...');
    try {
      execSync('npm run type-check', { cwd: this.projectRoot, stdio: 'pipe' });
      console.log('✅ TypeScript check passed!');
      return true;
    } catch (error) {
      console.log('❌ TypeScript check still has issues.');
      console.log('💡 Some errors may require manual fixes.');
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Netlify Error Detection and Auto-Fixer

Usage:
  node error-fixer.js [options]

Options:
  --run-type-check    Run TypeScript check after applying fixes
  --help, -h          Show this help message

Examples:
  node error-fixer.js                     # Analyze and fix errors
  node error-fixer.js --run-type-check    # Fix and then run type check
    `);
    return;
  }

  const fixer = new ErrorFixer();
  await fixer.analyzeAndFix();

  if (args.includes('--run-type-check')) {
    await fixer.runTypeCheck();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ErrorFixer;