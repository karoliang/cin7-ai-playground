# GitHub Automation Setup for CIN7 AI Playground

## Overview

This document outlines the comprehensive GitHub automation setup for the CIN7 AI Playground project, ensuring automatic commits, pushes, and synchronization throughout the development lifecycle.

## Automation Strategy

### 1. Automatic Commit & Push Configuration

#### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && git add .",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

#### Automatic Commit Scripts
```bash
#!/bin/bash
# scripts/auto-commit.sh

# Check if there are changes to commit
if [[ -z $(git status --porcelain) ]]; then
    echo "No changes to commit"
    exit 0
fi

# Add all changes
git add .

# Generate commit message based on changes
COMMIT_MESSAGE=$(npm run generate-commit-message)

# Commit with generated message
git commit -m "$COMMIT_MESSAGE"

# Push to current branch
git push origin $(git branch --show-current)

echo "Changes committed and pushed successfully"
```

### 2. GitHub Actions Workflow

#### Main CI/CD Pipeline
```yaml
# .github/workflows/main.yml
name: CIN7 AI Playground CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Security audit
        run: npm audit --audit-level high

  auto-commit-and-push:
    needs: test-and-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run any post-build scripts
        run: npm run post-build

      - name: Commit and push any changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Auto-commit: Post-build updates [skip ci]"
            git push
          fi

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: test-and-build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploying to staging environment"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test-and-build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: echo "Deploying to production environment"
```

#### Documentation Auto-Update Workflow
```yaml
# .github/workflows/docs-update.yml
name: Update Documentation

on:
  push:
    paths:
      - 'docs/**'
      - 'README.md'
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate documentation
        run: |
          npm run docs:generate
          npm run docs:build

      - name: Commit documentation changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          if git diff --staged --quiet; then
            echo "No documentation changes to commit"
          else
            git commit -m "docs: Auto-update documentation [skip ci]"
            git push
          fi
```

### 3. Branch Management Strategy

#### Branch Protection Rules
```yaml
# .github/branch-protection.yml
protection_rules:
  main:
    required_status_checks:
      strict: true
      contexts:
        - "test-and-build"
        - "security-audit"
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    restrictions:
      users: []
      teams: ["core-developers"]

  develop:
    required_status_checks:
      strict: true
      contexts:
        - "test-and-build"
    enforce_admins: false
    required_pull_request_reviews:
      required_approving_review_count: 1
```

#### Automated Branch Creation
```bash
#!/bin/bash
# scripts/create-branch.sh

BRANCH_NAME=$1
BRANCH_TYPE=$2  # feature, bugfix, hotfix

if [ -z "$BRANCH_NAME" ]; then
    echo "Usage: ./create-branch.sh <branch-name> <branch-type>"
    exit 1
fi

case $BRANCH_TYPE in
    feature)
        PREFIX="feature/"
        BASE_BRANCH="develop"
        ;;
    bugfix)
        PREFIX="bugfix/"
        BASE_BRANCH="develop"
        ;;
    hotfix)
        PREFIX="hotfix/"
        BASE_BRANCH="main"
        ;;
    *)
        PREFIX="feature/"
        BASE_BRANCH="develop"
        ;;
esac

FULL_BRANCH_NAME="${PREFIX}${BRANCH_NAME}"

# Create and checkout new branch
git checkout -b "$FULL_BRANCH_NAME" "$BASE_BRANCH"

# Push to remote
git push -u origin "$FULL_BRANCH_NAME"

echo "Created branch: $FULL_BRANCH_NAME from $BASE_BRANCH"
```

### 4. Automatic Commit Message Generation

#### Commit Message Generator
```javascript
// scripts/generate-commit-message.js
const { execSync } = require('child_process');
const fs = require('fs');

function generateCommitMessage() {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n');

    // Categorize changes
    const changes = {
        docs: [],
        feat: [],
        fix: [],
        refactor: [],
        test: [],
        chore: [],
        style: []
    };

    stagedFiles.forEach(file => {
        if (file.startsWith('docs/')) changes.docs.push(file);
        else if (file.includes('test') || file.includes('spec')) changes.test.push(file);
        else if (file.includes('component') || file.includes('page')) changes.feat.push(file);
        else if (file.includes('fix') || file.includes('bug')) changes.fix.push(file);
        else if (file.includes('refactor') || file.includes('cleanup')) changes.refactor.push(file);
        else if (file.includes('style') || file.includes('css')) changes.style.push(file);
        else changes.chore.push(file);
    });

    // Generate commit message
    const commitParts = [];

    Object.entries(changes).forEach(([type, files]) => {
        if (files.length > 0) {
            commitParts.push(`${type}: ${files.length} file(s) updated`);
        }
    });

    // Add automatic timestamp and context
    const timestamp = new Date().toISOString();
    const message = `Auto-commit: ${commitParts.join(', ')}\n\nTimestamp: ${timestamp}\nFiles: ${stagedFiles.join(', ')}`;

    return message;
}

if (require.main === module) {
    console.log(generateCommitMessage());
}

module.exports = { generateCommitMessage };
```

### 5. Integration with Development Workflow

#### Development Watcher
```javascript
// scripts/dev-watcher.js
const chokidar = require('chokidar');
const { execSync } = require('child_process');

class DevelopmentWatcher {
    constructor() {
        this.debounceTime = 5000; // 5 seconds
        this.pendingCommit = false;
        this.watchPatterns = [
            'src/**/*',
            'docs/**/*',
            'package.json',
            'README.md'
        ];
    }

    start() {
        console.log('Starting development watcher with auto-commit...');

        const watcher = chokidar.watch(this.watchPatterns, {
            ignored: /node_modules/,
            persistent: true
        });

        watcher.on('change', (path) => {
            console.log(`File changed: ${path}`);
            this.scheduleAutoCommit();
        });

        watcher.on('add', (path) => {
            console.log(`File added: ${path}`);
            this.scheduleAutoCommit();
        });

        watcher.on('unlink', (path) => {
            console.log(`File removed: ${path}`);
            this.scheduleAutoCommit();
        });
    }

    scheduleAutoCommit() {
        if (this.pendingCommit) return;

        this.pendingCommit = true;

        setTimeout(() => {
            this.autoCommit();
            this.pendingCommit = false;
        }, this.debounceTime);
    }

    autoCommit() {
        try {
            // Check if there are changes
            const status = execSync('git status --porcelain', { encoding: 'utf8' });

            if (status.trim()) {
                console.log('Auto-committing changes...');

                // Add changes
                execSync('git add .');

                // Generate commit message
                const commitMessage = execSync('node scripts/generate-commit-message.js', { encoding: 'utf8' });

                // Commit
                execSync(`git commit -m "${commitMessage.trim()}"`);

                // Push
                execSync('git push');

                console.log('Auto-commit completed successfully!');
            }
        } catch (error) {
            console.error('Auto-commit failed:', error.message);
        }
    }
}

// Start watcher if run directly
if (require.main === module) {
    const watcher = new DevelopmentWatcher();
    watcher.start();
}

module.exports = DevelopmentWatcher;
```

### 6. Package.json Scripts

```json
{
  "scripts": {
    "dev": "npm run dev:watch & npm run dev:server",
    "dev:watch": "node scripts/dev-watcher.js",
    "dev:server": "vite",
    "auto-commit": "bash scripts/auto-commit.sh",
    "generate-commit-message": "node scripts/generate-commit-message.js",
    "create-branch": "bash scripts/create-branch.sh",
    "post-build": "npm run docs:generate && npm run auto-commit",
    "docs:generate": "typedoc src --out docs/api",
    "docs:build": "vitepress build docs",
    "pre-push": "npm run test && npm run lint",
    "commit": "git-cz"
  }
}
```

### 7. Git Configuration

#### .gitattributes
```
# Auto detect text files and perform LF normalization
* text=auto

# Explicitly declare text files you want to always be normalized
*.js text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.jsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.yml text eol=lf
*.yaml text eol=lf

# Declare files that should always be CRLF
*.bat text eol=crlf
*.cmd text eol=crlf

# Declare binary files
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.svg binary
*.pdf binary

# Exclude generated files
dist/ export-ignore
node_modules/ export-ignore
.env* export-ignore
coverage/ export-ignore
```

#### .gitignore
```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Coverage reports
coverage/
.nyc_output/

# Temporary files
tmp/
temp/

# Auto-generated documentation
docs/api/
docs/.vitepress/dist/
```

## Implementation Steps

### 1. Set up GitHub Repository Structure
- Create protected branches (main, develop)
- Configure branch protection rules
- Set up GitHub Projects for task management

### 2. Install Development Dependencies
```bash
npm install --save-dev husky lint-staged commitizen commitlint @commitlint/cli @commitlint/config-conventional
```

### 3. Configure Hooks and Scripts
- Set up pre-commit hooks
- Configure automatic commit scripts
- Set up development watcher

### 4. Create GitHub Actions Workflows
- Set up CI/CD pipeline
- Configure documentation auto-update
- Set up deployment workflows

### 5. Test Automation
- Verify automatic commits work
- Test GitHub Actions workflows
- Validate branch protection rules

## Benefits

1. **Automatic Version Control**: Every change is automatically committed and pushed
2. **Consistent Commit Messages**: Standardized commit message format
3. **Continuous Integration**: Automated testing and building
4. **Documentation Sync**: Automatic documentation updates
5. **Branch Management**: Automated branch creation and protection
6. **Deployment Automation**: Automatic deployments on merge
7. **Development Workflow**: Seamless integration with development process

This comprehensive automation setup ensures that the CIN7 AI Playground project maintains perfect synchronization with GitHub throughout the entire development lifecycle.

---

*GitHub automation setup configured for CIN7 AI Playground development workflow*