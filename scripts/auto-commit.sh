#!/bin/bash

# Auto-commit script for CIN7 AI Playground
# This script automatically commits and pushes changes to GitHub

set -e

echo "🤖 Starting auto-commit process..."

# Check if there are changes to commit
if [[ -z $(git status --porcelain) ]]; then
    echo "✅ No changes to commit"
    exit 0
fi

# Show what will be committed
echo "📋 Changes to be committed:"
git status --porcelain

# Add all changes
echo "📝 Adding all changes..."
git add .

# Generate commit message based on changes
echo "💭 Generating commit message..."
COMMIT_MESSAGE=$(node -e "
const { execSync } = require('child_process');
const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const timestamp = new Date().toISOString();

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

status.forEach(file => {
    const [_, fileName] = file.split(/\s+/);
    if (fileName.startsWith('docs/')) changes.docs.push(fileName);
    else if (fileName.includes('test') || fileName.includes('spec')) changes.test.push(fileName);
    else if (fileName.includes('component') || fileName.includes('page')) changes.feat.push(fileName);
    else if (fileName.includes('fix') || fileName.includes('bug')) changes.fix.push(fileName);
    else if (fileName.includes('refactor') || fileName.includes('cleanup')) changes.refactor.push(fileName);
    else if (fileName.includes('style') || fileName.includes('css')) changes.style.push(fileName);
    else changes.chore.push(fileName);
});

// Generate commit message
const commitParts = [];
Object.entries(changes).forEach(([type, files]) => {
    if (files.length > 0) {
        commitParts.push(\`\${type}: \${files.length} file(s)\`);
    }
});

const message = \`auto: \${commitParts.join(', ')}\n\nTimestamp: \${timestamp}\nFiles: \${status.length} total changes\`;
console.log(message);
")

# Commit with generated message
echo "📦 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Push to current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🚀 Pushing to branch: $CURRENT_BRANCH"
git push origin "$CURRENT_BRANCH"

echo "✅ Auto-commit completed successfully!"
echo "📊 Commit details:"
echo "   - Branch: $CURRENT_BRANCH"
echo "   - Files changed: $(git diff --name-only HEAD~1 | wc -l | tr -d ' ')"
echo "   - Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"