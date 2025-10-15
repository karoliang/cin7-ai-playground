#!/usr/bin/env node

/**
 * Simple Error Fixer
 * Basic automated fixing for common TypeScript and Polaris issues
 */

const { execSync, spawn } = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const path = require('path');

class SimpleErrorFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixesApplied = 0;
  }

  async runTypeCheck() {
    console.log('🔍 Running TypeScript type check...');
    try {
      execSync('npm run type-check', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log('✅ TypeScript check passed!');
      return true;
    } catch (error) {
      console.log('❌ TypeScript errors detected. Analyzing...');
      return false;
    }
  }

  async getTSErrors() {
    try {
      const output = execSync('npm run type-check', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      return []; // No errors
    } catch (error) {
      return error.stdout || error.stderr || '';
    }
  }

  parseTSErrors(errorOutput) {
    const errors = [];
    const lines = errorOutput.split('\n');

    for (const line of lines) {
      // Parse error format: src/file.ts(line,column): error TS####: message
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      if (match) {
        const [, file, lineNum, colNum, errorCode, message] = match;
        errors.push({
          file: file.trim(),
          line: parseInt(lineNum),
          column: parseInt(colNum),
          code: errorCode,
          message: message.trim()
        });
      }
    }

    return errors;
  }

  async fixMissingAsProp(errors) {
    const missingAsErrors = errors.filter(e =>
      e.message.includes("Property 'as' is missing") &&
      e.file.includes('.tsx')
    );

    for (const error of missingAsErrors) {
      if (await this.fixTextComponentAsProp(error.file)) {
        this.fixesApplied++;
        console.log(`✅ Fixed missing 'as' prop in ${error.file}`);
      }
    }
  }

  async fixMissingAutoComplete(errors) {
    const autoCompleteErrors = errors.filter(e =>
      e.message.includes("Property 'autoComplete' is missing") &&
      e.file.includes('.tsx')
    );

    for (const error of autoCompleteErrors) {
      if (await this.fixTextFieldAutoComplete(error.file)) {
        this.fixesApplied++;
        console.log(`✅ Fixed missing 'autoComplete' prop in ${error.file}`);
      }
    }
  }

  async fixTextComponentAsProp(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    try {
      if (!existsSync(fullPath)) return false;

      let content = readFileSync(fullPath, 'utf8');

      // Find Text components without 'as' prop and add it
      const originalContent = content;

      // Pattern to match Text components without 'as' prop
      content = content.replace(
        /<Text\s+variant="([^"]+)"([^>]*?)(?!.*\bas\s*=)/g,
        (match, variant, otherProps) => {
          // Avoid adding 'as' if it's already there
          if (match.includes('as=')) return match;
          return `<Text variant="${variant}" as="p"${otherProps}>`;
        }
      );

      // Also handle Text components with different prop orders
      content = content.replace(
        /<Text([^>]*?)variant="([^"]+)"([^>]*?)(?!.*\bas\s*=)/g,
        (match, beforeProps, variant, afterProps) => {
          if (match.includes('as=')) return match;
          return `<Text${beforeProps}variant="${variant}" as="p"${afterProps}>`;
        }
      );

      if (content !== originalContent) {
        writeFileSync(fullPath, content);
        return true;
      }
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
    }
    return false;
  }

  async fixTextFieldAutoComplete(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    try {
      if (!existsSync(fullPath)) return false;

      let content = readFileSync(fullPath, 'utf8');
      const originalContent = content;

      // Add autoComplete prop to TextField components that don't have it
      content = content.replace(
        /<TextField\s+([^>]*?)(?!.*\sautoComplete\s*=)/g,
        (match, props) => {
          // Avoid adding if autoComplete is already present
          if (match.includes('autoComplete=')) return match;

          // Find a good place to insert the prop (before closing >)
          return match.replace('>', ' autoComplete="off">');
        }
      );

      if (content !== originalContent) {
        writeFileSync(fullPath, content);
        return true;
      }
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
    }
    return false;
  }

  async fixCardSections(errors) {
    const cardSectionErrors = errors.filter(e =>
      e.message.includes("Property 'Section' does not exist") &&
      e.file.includes('.tsx')
    );

    for (const error of cardSectionErrors) {
      if (await this.fixCardSectionUsage(error.file)) {
        this.fixesApplied++;
        console.log(`✅ Fixed Card.Section usage in ${error.file}`);
      }
    }
  }

  async fixCardSectionUsage(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    try {
      if (!existsSync(fullPath)) return false;

      let content = readFileSync(fullPath, 'utf8');
      const originalContent = content;

      // Replace Card.Section with div
      content = content.replace(/<Card\.Section([^>]*)>/g, '<div$1>');
      content = content.replace(/<\/Card\.Section>/g, '</div>');

      if (content !== originalContent) {
        writeFileSync(fullPath, content);
        return true;
      }
    } catch (error) {
      console.error(`Failed to fix ${filePath}:`, error.message);
    }
    return false;
  }

  async applyFixes() {
    console.log('🔧 Analyzing and fixing TypeScript errors...\n');

    // Get current TypeScript errors
    const errorOutput = await this.getTSErrors();
    if (!errorOutput) {
      console.log('✅ No TypeScript errors found!');
      return;
    }

    const errors = this.parseTSErrors(errorOutput);
    console.log(`📋 Found ${errors.length} TypeScript errors\n`);

    // Apply fixes for different error types
    await this.fixMissingAsProp(errors);
    await this.fixMissingAutoComplete(errors);
    await this.fixCardSections(errors);

    if (this.fixesApplied > 0) {
      console.log(`\n🎉 Applied ${this.fixesApplied} automated fixes!`);
      console.log('💡 Run "npm run type-check" again to see remaining errors.');
    } else {
      console.log('\n⚠️  No automated fixes available for these errors.');
      console.log('💡 Manual intervention may be required.');
    }
  }

  async runBuildTest() {
    console.log('\n🏗️  Testing build after fixes...');
    try {
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log('✅ Build successful! All issues resolved.');
      return true;
    } catch (error) {
      console.log('❌ Build still has issues. Some errors may need manual fixes.');
      return false;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Simple Error Fixer

Usage:
  node simple-fixer.cjs [options]

Options:
  --run-build     Run build test after applying fixes
  --help, -h      Show this help message

Examples:
  node simple-fixer.cjs                # Fix TypeScript errors
  node simple-fixer.cjs --run-build    # Fix and test build
    `);
    process.exit(0);
  }

  const fixer = new SimpleErrorFixer();

  // Apply fixes
  await fixer.applyFixes();

  // Optional build test
  if (args.includes('--run-build')) {
    await fixer.runBuildTest();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimpleErrorFixer;