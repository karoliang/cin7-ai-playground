# CIN7 AI Playground - Development Environment Setup

## Overview

This document provides comprehensive guidelines for setting up the development environment for Phase 1 of the CIN7 AI Playground project. It includes all necessary tools, configurations, and procedures to ensure a productive development workflow.

## System Requirements

### Hardware Requirements

```yaml
Minimum Requirements:
  CPU: 4 cores (Intel i5 or AMD Ryzen 5)
  RAM: 8GB (16GB recommended)
  Storage: 20GB free space
  Network: Broadband internet connection

Recommended Requirements:
  CPU: 8 cores (Intel i7 or AMD Ryzen 7)
  RAM: 16GB+ (32GB optimal)
  Storage: 50GB free space (SSD recommended)
  Network: High-speed broadband
```

### Software Requirements

```yaml
Operating Systems:
  - macOS 12.0+ (Monterey or later)
  - Windows 10/11 (64-bit)
  - Ubuntu 20.04+ or equivalent

Required Software:
  - Node.js 18.x LTS or later
  - Git 2.30+
  - Visual Studio Code or equivalent IDE
  - Docker Desktop (optional, for local development)

Recommended Tools:
  - Postman or API testing tool
  - Database client (DBeaver, TablePlus)
  - Browser with developer tools (Chrome/Edge/Firefox)
```

## Development Tools Installation

### Node.js Setup

#### Installation
```bash
# Using Node Version Manager (nvm) - Recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

#### Configuration
```bash
# Configure npm for development
npm config set init-author-name "Your Name"
npm config set init-author-email "your.email@cin7.com"
npm config set init-license "ISC"

# Set npm registry (if using private registry)
# npm config set registry https://registry.npmjs.org/
```

### Git Configuration

#### Installation
```bash
# Verify git installation
git --version

# Configure git user identity
git config --global user.name "Your Name"
git config --global user.email "your.email@cin7.com"

# Configure git defaults
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input  # Linux/Mac
# git config --global core.autocrlf true   # Windows
```

#### SSH Keys Setup
```bash
# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "your.email@cin7.com"

# Add SSH key to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub
# Add to GitHub: https://github.com/settings/keys
```

### Visual Studio Code Setup

#### Installation and Extensions
```bash
# Install VS Code
# Download from https://code.visualstudio.com/

# Essential Extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension ms-vscode.vscode-html-css

# Supabase Extensions
code --install-extension supabase.supabase

# Git Extensions
code --install-extension eamodio.gitlens
code --install-extension ms-vscode.git-extension-pack

# Testing Extensions
code --install-extension vitest.explorer
code --install-extension ms-playwright.playwright
```

#### VS Code Configuration
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Database Client Setup

#### DBeaver Configuration (Recommended)
```yaml
Installation:
  - Download from https://dbeaver.io/
  - Install community edition

Configuration:
  - Create new connection: PostgreSQL
  - Host: Your Supabase project URL
  - Port: 5432
  - Database: postgres
  - Username: postgres
  - Password: Your Supabase password
  - SSL: Required
```

#### Alternative: TablePlus
```yaml
Installation:
  - Download from https://tableplus.com/
  - Install and configure PostgreSQL connection

Benefits:
  - Modern UI
  - Better query editor
  - Real-time collaboration features
```

## Project Setup

### Repository Cloning and Initialization

```bash
# Clone the repository
git clone https://github.com/karoliang/cin7-ai-playground.git
cd cin7-ai-playground

# Verify project structure
ls -la

# Install dependencies
npm install

# Verify installation
npm run dev  # Should start development server
```

### Environment Configuration

#### Environment Variables Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
# Use VS Code or your preferred editor
code .env.local
```

#### Required Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Development Configuration
VITE_API_URL=http://localhost:54321/functions/v1
VITE_APP_URL=http://localhost:3000

# AI Configuration (Phase 2+)
VITE_GLM_API_KEY=your_glm_api_key
VITE_DEFAULT_AI_MODEL=glm-4

# Feature Flags
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_AI_FEATURES=false
VITE_ENABLE_EXTERNAL_INTEGRATIONS=false

# Development Flags
VITE_DEV_MODE=true
VITE_DEBUG_MODE=false
```

#### Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Start local development
supabase start
```

### Database Setup

#### Local Development Database
```bash
# Start Supabase local stack
supabase start

# Run database migrations
supabase db push

# Seed database with test data
supabase db seed
```

#### Migration Scripts
```sql
-- Create initial database structure
-- File: supabase/migrations/20231015_001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'archived', 'deleted');
CREATE TYPE file_type AS ENUM ('html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md', 'txt', 'image', 'other');

-- Core tables
-- (Refer to TECHNICAL_SPECIFICATIONS.md for complete schema)
```

## Development Workflow

### Daily Development Process

#### Starting Development
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install new dependencies (if any)
npm install

# 3. Start Supabase local development
supabase start

# 4. Start development server
npm run dev

# 5. Run tests in parallel (optional)
npm run test:watch
```

#### Creating Feature Branches
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/story-number-short-description

# Example:
git checkout -b feature/1.1-tenant-database-schema
```

#### Making Changes
```bash
# Make code changes
# ...

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

#### Committing Changes
```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: implement tenant database schema

- Add tenant_id columns to core tables
- Implement RLS policies for data isolation
- Create tenant management API endpoints
- Add tenant validation logic

Closes #1"

# Push to feature branch
git push origin feature/1.1-tenant-database-schema
```

### Testing Strategy

#### Local Testing Setup
```bash
# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jsdom

# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests (when implemented)
npm run test:e2e
```

#### Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

### Code Quality Tools

#### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react-hooks", "react"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## IDE Configuration

### VS Code Workspace Settings

```json
// .vscode/workspace.json
{
  "folders": [
    {
      "path": ".",
      "name": "CIN7 AI Playground"
    }
  ],
  "settings": {
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": true,
      "**/.DS_Store": true
    }
  },
  "extensions": {
    "recommendations": [
      "ms-vscode.vscode-typescript-next",
      "esbenp.prettier-vscode",
      "dbaeumer.vscode-eslint",
      "bradlc.vscode-tailwindcss",
      "supabase.supabase"
    ]
  },
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug React App",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/node_modules/.bin/vite",
        "args": ["--mode", "development"],
        "env": {
          "NODE_ENV": "development"
        },
        "console": "integratedTerminal",
        "internalConsoleOptions": "neverOpen"
      }
    ]
  }
}
```

### Debugging Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug React App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["--mode", "development", "--debug"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "port": 9229
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["--run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## API Development

### Supabase Edge Functions

#### Local Development
```bash
# Start Supabase functions locally
supabase functions serve

# Deploy function
supabase functions deploy function-name
```

#### Function Structure
```typescript
// supabase/functions/tenant-management/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Your function logic here
    const { data, error } = await supabase
      .from('tenants')
      .select('*')

    if (error) throw error

    return new Response(
      JSON.stringify({ data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
```

### API Testing

#### Postman Collection Setup
```json
{
  "info": {
    "name": "CIN7 AI Playground API",
    "description": "API collection for development testing"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:54321/functions/v1"
    },
    {
      "key": "authToken",
      "value": "your-auth-token"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Sign In",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@cin7.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": "{{baseUrl}}/auth/signin"
          }
        }
      ]
    }
  ]
}
```

## Database Development

### Local Database Management

#### Schema Management
```bash
# Create new migration
supabase db diff --use-migra -s public > supabase/migrations/new_migration.sql

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

#### Seed Data
```sql
-- supabase/seed.sql
INSERT INTO tenants (id, name, slug, domain, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', '@cin7.com', NOW());

INSERT INTO users (id, email, name, tenant_id, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@cin7.com', 'Admin User', '00000000-0000-0000-0000-000000000001', NOW());
```

### Database Testing

#### Test Database Setup
```bash
# Create test database
createdb cin7_ai_playground_test

# Run test migrations
DATABASE_URL=postgresql://localhost/cin7_ai_playground_test npm run db:migrate

# Seed test data
DATABASE_URL=postgresql://localhost/cin7_ai_playground_test npm run db:seed
```

## Performance Monitoring

### Local Performance Tools

#### React Developer Tools
```bash
# Install React DevTools browser extension
# https://chrome.google.com/webstore/detail/react-developer-tools/

# Performance profiling
# 1. Open DevTools
# 2. Go to Performance tab
# 3. Record interactions
# 4. Analyze results
```

#### Database Performance
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Analyze slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

## Troubleshooting

### Common Issues

#### Environment Setup Issues
```bash
# Node.js version issues
nvm use 18
node --version

# Clean npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Supabase connection issues
supabase stop
supabase start
```

#### Database Issues
```bash
# Reset database
supabase db reset

# Check database status
supabase db status

# Recreate migrations
supabase db diff
```

#### Build Issues
```bash
# Clean build artifacts
rm -rf dist
npm run build

# Check TypeScript errors
npm run type-check

# Check ESLint errors
npm run lint
```

### Performance Issues

#### Slow Development Server
```bash
# Check Node.js version
node --version

# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use Vite's HMR optimization
# Update vite.config.ts if needed
```

#### Database Performance
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Security Best Practices

### Local Development Security

#### Environment Variables
```bash
# Never commit secrets
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Use secure values for development
# Don't use production secrets locally
```

#### API Keys
```typescript
// Validate API keys in development
const validateApiKey = (key: string): boolean => {
  // Implement validation logic
  return key.startsWith('sk_test_') || key.startsWith('sk_dev_');
};
```

### Code Security

#### Input Validation
```typescript
// Validate user inputs
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.endsWith('@cin7.com');
};
```

#### SQL Injection Prevention
```typescript
// Use parameterized queries
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('tenant_id', tenantId)  // Safe parameterization
  .eq('created_by', userId);
```

## Documentation Standards

### Code Documentation

#### JSDoc Comments
```typescript
/**
 * Creates a new tenant with validation
 * @param tenantData - The tenant data to create
 * @param userId - The ID of the user creating the tenant
 * @returns Promise resolving to the created tenant
 * @throws {ValidationError} When tenant data is invalid
 * @throws {DatabaseError} When database operation fails
 */
export async function createTenant(
  tenantData: CreateTenantRequest,
  userId: string
): Promise<Tenant> {
  // Implementation
}
```

#### README Files
```markdown
# Component Name

## Description
Brief description of what this component does.

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| data | Tenant[] | Yes | Array of tenants to display |

## Usage
```tsx
<TenantList
  tenants={tenants}
  onTenantSelect={handleTenantSelect}
/>
```

## Examples
Include usage examples and edge cases.
```

### API Documentation

#### OpenAPI Specification
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: CIN7 AI Playground API
  version: 1.0.0
  description: API for CIN7 AI Playground multi-tenant platform

paths:
  /api/tenants:
    post:
      summary: Create a new tenant
      tags:
        - Tenants
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTenantRequest'
      responses:
        '201':
          description: Tenant created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tenant'
```

---

This comprehensive development environment setup guide ensures all team members have a consistent, productive development experience. Regular updates to this document will keep it relevant as the project evolves.

The next step is to create the database implementation and migration strategy to support the multi-tenant architecture.