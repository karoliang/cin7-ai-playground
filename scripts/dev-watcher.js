#!/usr/bin/env node

import chokidar from 'chokidar';
import { execSync } from 'child_process';

class DevelopmentWatcher {
    constructor() {
        this.debounceTime = 5000; // 5 seconds
        this.pendingCommit = false;
        this.watchPatterns = [
            'src/**/*',
            'docs/**/*',
            'scripts/**/*',
            'package.json',
            'README.md',
            '.github/**/*'
        ];

        // Ignore certain patterns
        this.ignoredPatterns = [
            /node_modules/,
            /dist/,
            /build/,
            /coverage/,
            /\.git/,
            /logs/,
            /\.env/
        ];
    }

    start() {
        console.log('🔍 Starting CIN7 AI Playground development watcher with auto-commit...');
        console.log('📁 Watching patterns:', this.watchPatterns.join(', '));
        console.log('⏱️  Debounce time:', this.debounceTime + 'ms');

        const watcher = chokidar.watch(this.watchPatterns, {
            ignored: this.ignoredPatterns,
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', (path) => {
            console.log(`📝 File changed: ${path}`);
            this.scheduleAutoCommit();
        });

        watcher.on('add', (path) => {
            console.log(`➕ File added: ${path}`);
            this.scheduleAutoCommit();
        });

        watcher.on('unlink', (path) => {
            console.log(`➖ File removed: ${path}`);
            this.scheduleAutoCommit();
        });

        console.log('✅ Development watcher started successfully!');
        console.log('💡 Any changes will be automatically committed and pushed to GitHub');
    }

    scheduleAutoCommit() {
        if (this.pendingCommit) {
            console.log('⏳ Commit already scheduled, skipping...');
            return;
        }

        this.pendingCommit = true;
        console.log('⏰ Scheduling auto-commit in', this.debounceTime / 1000, 'seconds...');

        setTimeout(() => {
            this.autoCommit();
            this.pendingCommit = false;
        }, this.debounceTime);
    }

    autoCommit() {
        try {
            // Check if there are changes
            const status = execSync('git status --porcelain', { encoding: 'utf8' });

            if (!status.trim()) {
                console.log('✅ No changes to commit');
                return;
            }

            console.log('🤖 Auto-committing changes...');

            // Add changes
            execSync('git add .', { encoding: 'utf8' });

            // Generate commit message
            const commitMessage = this.generateCommitMessage(status);

            // Commit
            execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });

            // Push
            const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            execSync('git push origin ' + currentBranch, { encoding: 'utf8' });

            console.log('✅ Auto-commit completed successfully!');
            console.log(`📊 Committed to branch: ${currentBranch}`);
            console.log(`📝 Commit message: ${commitMessage.split('\n')[0]}`);

        } catch (error) {
            console.error('❌ Auto-commit failed:', error.message);

            // If it's a git error, try to get more details
            if (error.message.includes('git')) {
                try {
                    const gitStatus = execSync('git status', { encoding: 'utf8' });
                    console.error('📋 Git status:', gitStatus);
                } catch (statusError) {
                    console.error('❌ Could not get git status:', statusError.message);
                }
            }
        }
    }

    generateCommitMessage(status) {
        const files = status.trim().split('\n').filter(Boolean);
        const timestamp = new Date().toISOString();

        // Categorize changes
        const changes = {
            docs: [],
            feat: [],
            fix: [],
            refactor: [],
            test: [],
            chore: [],
            style: [],
            config: []
        };

        files.forEach(file => {
            const [_, fileName] = file.split(/\s+/);

            if (fileName.startsWith('docs/')) changes.docs.push(fileName);
            else if (fileName.startsWith('src/')) {
                if (fileName.includes('test') || fileName.includes('spec')) changes.test.push(fileName);
                else if (fileName.includes('component') || fileName.includes('page')) changes.feat.push(fileName);
                else if (fileName.includes('fix') || fileName.includes('bug')) changes.fix.push(fileName);
                else if (fileName.includes('refactor') || fileName.includes('cleanup')) changes.refactor.push(fileName);
                else if (fileName.includes('style') || fileName.includes('css')) changes.style.push(fileName);
                else changes.feat.push(fileName);
            } else if (fileName.startsWith('scripts/')) changes.chore.push(fileName);
            else if (fileName.startsWith('.github/') || fileName === 'package.json') changes.config.push(fileName);
            else changes.chore.push(fileName);
        });

        // Generate commit message
        const commitParts = [];
        Object.entries(changes).forEach(([type, files]) => {
            if (files.length > 0) {
                commitParts.push(`${type}: ${files.length} file(s)`);
            }
        });

        const message = `auto: ${commitParts.join(', ')}\n\nTimestamp: ${timestamp}\nFiles: ${files.length} total changes`;
        return message;
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Development watcher stopped by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Development watcher terminated');
    process.exit(0);
});

// Start watcher if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const watcher = new DevelopmentWatcher();
    watcher.start();
}

export default DevelopmentWatcher;