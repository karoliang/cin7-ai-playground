# CIN7 AI Playground - Database Implementation & Migration Strategy

## Overview

This document outlines the comprehensive database implementation and migration strategy for transforming the CIN7 AI Playground from a single-user application to a multi-tenant platform. It includes schema design, migration scripts, and operational procedures.

## Current State Analysis

### Existing Database Structure

The current single-user application has a basic database structure:

```sql
-- Current simplified schema
users (id, email, name, created_at)
projects (id, name, description, user_id, created_at)
project_files (id, project_id, name, content, created_at)
```

### Migration Requirements

**Transformation Needed**:
- Add tenant isolation to all tables
- Implement Row-Level Security (RLS) policies
- Add audit logging capabilities
- Enhance user management and permissions
- Add collaboration features
- Implement real-time session tracking

## Target Multi-Tenant Schema

### Core Tables Design

#### 1. Tenants Table
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT DEFAULT '@cin7.com',
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'internal',
    max_users INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);
```

#### 2. Users Table (Enhanced)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'designer', 'viewer')),
    department TEXT,
    preferences JSONB DEFAULT '{}',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_active ON users(last_active);
CREATE INDEX idx_users_role ON users(role);
```

#### 3. User Tenant Membership Table
```sql
CREATE TABLE user_tenant_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_user_tenant_membership_user ON user_tenant_membership(user_id);
CREATE INDEX idx_user_tenant_membership_tenant ON user_tenant_membership(tenant_id);
CREATE INDEX idx_user_tenant_membership_role ON user_tenant_membership(role);
```

#### 4. Projects Table (Enhanced)
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    prompt TEXT,
    framework TEXT DEFAULT 'react' CHECK (framework IN ('vanilla', 'react', 'vue', 'angular', 'svelte')),
    template TEXT DEFAULT 'blank',
    architecture JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'deleted', 'building', 'deployed', 'error')),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    repository_url TEXT,
    deployment_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_framework ON projects(framework);
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

#### 5. Project Files Table (Enhanced)
```sql
CREATE TABLE project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md', 'txt', 'image', 'other')),
    content TEXT,
    language TEXT,
    path TEXT,
    size INTEGER,
    checksum TEXT,
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_tenant_id ON project_files(tenant_id);
CREATE INDEX idx_project_files_created_by ON project_files(created_by);
CREATE INDEX idx_project_files_type ON project_files(type);
CREATE INDEX idx_project_files_search ON project_files USING gin(to_tsvector('english', name || ' ' || COALESCE(content, '')));
```

#### 6. Project Collaborators Table
```sql
CREATE TABLE project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON project_collaborators(user_id);
CREATE INDEX idx_project_collaborators_tenant_id ON project_collaborators(tenant_id);
```

#### 7. Chat Messages Table
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_tenant_id ON chat_messages(tenant_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

#### 8. Real-Time Sessions Table
```sql
CREATE TABLE real_time_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    socket_id TEXT NOT NULL,
    cursor_position JSONB,
    active_file TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected')),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_real_time_sessions_project_id ON real_time_sessions(project_id);
CREATE INDEX idx_real_time_sessions_user_id ON real_time_sessions(user_id);
CREATE INDEX idx_real_time_sessions_tenant_id ON real_time_sessions(tenant_id);
CREATE INDEX idx_real_time_sessions_status ON real_time_sessions(status);
```

#### 9. Integrations Table
```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('jira', 'figma', 'github', 'slack')),
    name TEXT NOT NULL,
    configuration JSONB NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_frequency INTEGER DEFAULT 3600,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);
```

### Audit Tables

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    changed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### User Activities Table
```sql
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    activity_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_tenant_id ON user_activities(tenant_id);
CREATE INDEX idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp);
```

## Row-Level Security (RLS) Implementation

### RLS Policy Strategy

#### Tenant Isolation Policies
```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
```

#### Tenant Context Functions
```sql
-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user tenant membership
CREATE OR REPLACE FUNCTION user_has_tenant_access(user_id UUID, tenant_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_membership
    WHERE user_tenant_membership.user_id = user_has_tenant_access.user_id
    AND user_tenant_membership.tenant_id = user_has_tenant_access.tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Table-Specific RLS Policies

**Tenants Table Policies**:
```sql
-- Users can view their own tenants
CREATE POLICY "Users can view their tenants" ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_tenant_membership
            WHERE user_tenant_membership.tenant_id = tenants.id
            AND user_tenant_membership.user_id = auth.uid()
        )
    );

-- Only users with admin role can create tenants
CREATE POLICY "Admin users can create tenants" ON tenants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_tenant_membership
            WHERE user_tenant_membership.tenant_id = tenants.id
            AND user_tenant_membership.user_id = auth.uid()
            AND user_tenant_membership.role IN ('owner', 'admin')
        )
    );
```

**Projects Table Policies**:
```sql
-- Users can view projects they have access to
CREATE POLICY "Users can view accessible projects" ON projects
    FOR SELECT
    USING (
        projects.tenant_id = get_current_tenant_id()
        AND (
            projects.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM project_collaborators
                WHERE project_collaborators.project_id = projects.id
                AND project_collaborators.user_id = auth.uid()
            )
            OR projects.visibility = 'public'
        )
    );

-- Users can create projects in their tenant
CREATE POLICY "Users can create projects in tenant" ON projects
    FOR INSERT
    WITH CHECK (
        projects.tenant_id = get_current_tenant_id()
        AND projects.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM user_tenant_membership
            WHERE user_tenant_membership.user_id = auth.uid()
            AND user_tenant_membership.tenant_id = projects.tenant_id
        )
    );
```

**Project Files Table Policies**:
```sql
-- Users can view files in accessible projects
CREATE POLICY "Users can view accessible project files" ON project_files
    FOR SELECT
    USING (
        project_files.tenant_id = get_current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_files.project_id
            AND (
                projects.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_collaborators
                    WHERE project_collaborators.project_id = projects.id
                    AND project_collaborators.user_id = auth.uid()
                )
            )
        )
    );

-- Users can create files in their accessible projects
CREATE POLICY "Users can create files in projects" ON project_files
    FOR INSERT
    WITH CHECK (
        project_files.tenant_id = get_current_tenant_id()
        AND project_files.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_files.project_id
            AND (
                projects.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_collaborators
                    WHERE project_collaborators.project_id = projects.id
                    AND project_collaborators.user_id = auth.uid()
                    AND project_collaborators.role IN ('owner', 'editor')
                )
            )
        )
    );
```

## Migration Strategy

### Migration Phases

#### Phase 1: Schema Preparation (Week 1)
```sql
-- Migration: 001_prepare_multi_tenant_schema.sql

-- Create temporary backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE projects_backup AS SELECT * FROM projects;
CREATE TABLE project_files_backup AS SELECT * FROM project_files;

-- Add new columns to existing tables (nullable for now)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Create new tables
CREATE TABLE tenants (
    -- Schema as defined above
);

CREATE TABLE user_tenant_membership (
    -- Schema as defined above
);
```

#### Phase 2: Data Migration (Week 1-2)
```sql
-- Migration: 002_migrate_to_multi_tenant.sql

-- Create default tenant
INSERT INTO tenants (id, name, slug, domain, created_at)
VALUES (
    gen_random_uuid(),
    'Default Tenant',
    'default',
    '@cin7.com',
    NOW()
) RETURNING id;

-- Get default tenant ID for use in subsequent operations
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default';

    -- Update existing users with default tenant
    UPDATE users SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- Create user-tenant memberships
    INSERT INTO user_tenant_membership (user_id, tenant_id, role, joined_at)
    SELECT id, tenant_id, 'owner', created_at FROM users WHERE tenant_id = default_tenant_id;

    -- Update existing projects with tenant_id
    UPDATE projects SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- Update existing project files with tenant_id
    UPDATE project_files SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

    -- Update file tenant_id from project tenant_id
    UPDATE project_files SET tenant_id = projects.tenant_id
    FROM projects WHERE project_files.project_id = projects.id AND project_files.tenant_id IS NULL;
END $$;
```

#### Phase 3: Constraints and Indexes (Week 2)
```sql
-- Migration: 003_add_constraints_and_indexes.sql

-- Make tenant_id columns NOT NULL
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE project_files ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE projects ADD CONSTRAINT fk_projects_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE project_files ADD CONSTRAINT fk_project_files_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes as defined in schema section
-- (Refer to complete schema definition)
```

#### Phase 4: RLS Implementation (Week 2)
```sql
-- Migration: 004_implement_rls_policies.sql

-- Enable RLS on all tables
-- (Enable RLS statements as defined above)

-- Create RLS policy functions
-- (Functions as defined above)

-- Implement RLS policies
-- (Policies as defined above)
```

### Migration Scripts

#### Automated Migration Script
```typescript
// scripts/migrate-to-multi-tenant.ts
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

class MigrationManager {
  async runMigration(migrationName: string): Promise<void> {
    console.log(`Running migration: ${migrationName}`);

    try {
      // Read migration file
      const migrationSQL = await this.readMigrationFile(migrationName);

      // Execute migration
      const { error } = await supabase.rpc('execute_sql', { sql: migrationSQL });

      if (error) {
        throw error;
      }

      // Record migration
      await this.recordMigration(migrationName);

      console.log(`Migration ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  async rollbackMigration(migrationName: string): Promise<void> {
    console.log(`Rolling back migration: ${migrationName}`);

    try {
      const rollbackSQL = await this.readRollbackFile(migrationName);

      const { error } = await supabase.rpc('execute_sql', { sql: rollbackSQL });

      if (error) {
        throw error;
      }

      await this.removeMigrationRecord(migrationName);

      console.log(`Rollback ${migrationName} completed successfully`);
    } catch (error) {
      console.error(`Rollback ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async readMigrationFile(name: string): Promise<string> {
    // Implementation to read migration files
    throw new Error('Not implemented');
  }

  private async recordMigration(name: string): Promise<void> {
    // Implementation to record completed migrations
    throw new Error('Not implemented');
  }
}

// Usage
const migrationManager = new MigrationManager();

async function runMigrations() {
  const migrations = [
    '001_prepare_multi_tenant_schema',
    '002_migrate_to_multi_tenant',
    '003_add_constraints_and_indexes',
    '004_implement_rls_policies'
  ];

  for (const migration of migrations) {
    await migrationManager.runMigration(migration);
  }
}

runMigrations().catch(console.error);
```

### Backup and Recovery

#### Pre-Migration Backup
```bash
#!/bin/bash
# scripts/backup-before-migration.sh

set -e

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating pre-migration backup..."

# Database backup
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database.sql"

# File storage backup
if [ -d "./storage" ]; then
    cp -r ./storage "$BACKUP_DIR/"
fi

# Configuration backup
cp .env.local "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
```

#### Rollback Procedure
```bash
#!/bin/bash
# scripts/rollback-migration.sh

set -e

BACKUP_DIR=$1
if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "Rolling back to backup: $BACKUP_DIR"

# Stop application
npm run stop || true

# Restore database
psql "$DATABASE_URL" < "$BACKUP_DIR/database.sql"

# Restore file storage
if [ -d "$BACKUP_DIR/storage" ]; then
    rm -rf ./storage
    cp -r "$BACKUP_DIR/storage" ./
fi

# Restore configuration
cp "$BACKUP_DIR/.env.local" .env.local

echo "Rollback completed"
```

## Performance Optimization

### Indexing Strategy

#### Critical Indexes
```sql
-- Tenant-based filtering indexes
CREATE INDEX CONCURRENTLY idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_files_tenant_project ON project_files(tenant_id, project_id);
CREATE INDEX CONCURRENTLY idx_collaborators_tenant_project ON project_collaborators(tenant_id, project_id);

-- Search indexes
CREATE INDEX CONCURRENTLY idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX CONCURRENTLY idx_files_search ON project_files USING gin(to_tsvector('english', name || ' ' || COALESCE(content, '')));

-- Activity indexes
CREATE INDEX CONCURRENTLY idx_user_activities_tenant_timestamp ON user_activities(tenant_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp DESC);
```

#### Partial Indexes for Performance
```sql
-- Index only active projects
CREATE INDEX CONCURRENTLY idx_active_projects ON projects(created_at)
WHERE status = 'active';

-- Index only recent activities
CREATE INDEX CONCURRENTLY idx_recent_activities ON user_activities(timestamp)
WHERE timestamp > NOW() - INTERVAL '30 days';
```

### Query Optimization

#### Optimized Common Queries
```sql
-- Get user's projects with collaborator count
CREATE OR REPLACE FUNCTION get_user_projects_with_collaborators(
    user_id_param UUID,
    tenant_id_param UUID
)
RETURNS TABLE (
    project_id UUID,
    project_name TEXT,
    collaborator_count BIGINT,
    user_role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        COUNT(pc.user_id) FILTER (WHERE pc.user_id != user_id_param),
        CASE
            WHEN p.created_by = user_id_param THEN 'owner'
            ELSE pc.role
        END
    FROM projects p
    LEFT JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE p.tenant_id = tenant_id_param
    AND (
        p.created_by = user_id_param
        OR pc.user_id = user_id_param
    )
    GROUP BY p.id, p.name, p.created_by, pc.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Monitoring and Maintenance

### Database Health Monitoring

#### Monitoring Queries
```sql
-- Check RLS policy effectiveness
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public';

-- Check query performance
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Maintenance Tasks
```sql
-- Update statistics
ANALYZE;

-- Reindex fragmented indexes
REINDEX INDEX CONCURRENTLY idx_projects_tenant_status;

-- Clean up old audit logs (keep 1 year)
DELETE FROM audit_logs
WHERE timestamp < NOW() - INTERVAL '1 year';

-- Clean up old user activities (keep 90 days)
DELETE FROM user_activities
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Security Implementation

### Data Encryption

#### Sensitive Data Encryption
```sql
-- Extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(data::bytea, get_current_tenant_id()::text::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), get_current_tenant_id()::text::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Access Control

#### Database Roles
```sql
-- Application role
CREATE ROLE app_role;
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- Read-only role for analytics
CREATE ROLE readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
```

## Testing Strategy

### Database Testing

#### Unit Tests for RLS
```typescript
// tests/database/rls.test.ts
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Row-Level Security', () => {
  let tenant1User: any;
  let tenant2User: any;
  let tenant1Project: any;

  beforeAll(async () => {
    // Create test users and tenants
    tenant1User = await createTestUser('user1@cin7.com', 'tenant1');
    tenant2User = await createTestUser('user2@cin7.com', 'tenant2');
    tenant1Project = await createTestProject(tenant1User, 'tenant1');
  });

  it('should prevent cross-tenant project access', async () => {
    const { data, error } = await supabase(tenant2User.token)
      .from('projects')
      .select('*')
      .eq('id', tenant1Project.id);

    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('should allow access to own tenant projects', async () => {
    const { data, error } = await supabase(tenant1User.token)
      .from('projects')
      .select('*')
      .eq('id', tenant1Project.id);

    expect(data).toHaveLength(1);
    expect(error).toBeNull();
  });
});
```

#### Integration Tests
```typescript
// tests/database/migrations.test.ts
describe('Database Migrations', () => {
  it('should migrate from single-user to multi-tenant', async () => {
    // Create single-user data
    await createSingleUserTestData();

    // Run migration
    await runMigration('002_migrate_to_multi_tenant');

    // Verify multi-tenant structure
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*');

    expect(tenants).toHaveLength(1);
    expect(tenants[0].slug).toBe('default');

    // Verify user has tenant membership
    const { data: membership } = await supabase
      .from('user_tenant_membership')
      .select('*');

    expect(membership).toHaveLength(1);
  });
});
```

## Deployment Procedures

### Production Migration

#### Pre-Deployment Checklist
```bash
#!/bin/bash
# scripts/pre-deployment-checklist.sh

echo "Running pre-deployment checklist..."

# Check database connection
psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed"
    exit 1
fi

# Check backup
if [ ! -f "./backups/latest.sql" ]; then
    echo "❌ No recent backup found"
    exit 1
fi

# Check migration files
if [ ! -f "./supabase/migrations/004_implement_rls_policies.sql" ]; then
    echo "❌ Migration files missing"
    exit 1
fi

# Run tests
npm run test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ Pre-deployment checklist passed"
```

#### Migration Deployment
```bash
#!/bin/bash
# scripts/deploy-migration.sh

set -e

MIGRATION_NAME=$1
if [ -z "$MIGRATION_NAME" ]; then
    echo "Usage: $0 <migration_name>"
    exit 1
fi

echo "Deploying migration: $MIGRATION_NAME"

# Create backup
./scripts/backup-before-migration.sh

# Run migration
supabase db push --schema=public

# Verify migration
./scripts/verify-migration.sh "$MIGRATION_NAME"

echo "✅ Migration deployed successfully"
```

### Rollback Procedures

#### Emergency Rollback
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

set -e

BACKUP_DIR=$1
if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "🚨 EMERGENCY ROLLBACK INITIATED 🚨"

# Stop all services
docker-compose down || true
npm run stop || true

# Restore database
echo "Restoring database..."
psql "$DATABASE_URL" < "$BACKUP_DIR/database.sql"

# Restore file storage
if [ -d "$BACKUP_DIR/storage" ]; then
    echo "Restoring file storage..."
    rm -rf ./storage
    cp -r "$BACKUP_DIR/storage" ./
fi

# Restart services
echo "Restarting services..."
docker-compose up -d || true
npm run start || true

echo "✅ Emergency rollback completed"
```

## Documentation and Knowledge Transfer

### Database Documentation

#### Schema Documentation Generator
```typescript
// scripts/generate-db-docs.ts
import { createClient } from '@supabase/supabase-js';

class DatabaseDocumentationGenerator {
  async generateSchemaDocs(): Promise<void> {
    const tables = await this.getTables();
    const documentation = await this.buildDocumentation(tables);

    await this.writeDocumentation(documentation);
  }

  private async getTables(): Promise<Table[]> {
    // Implementation to fetch table information
    throw new Error('Not implemented');
  }

  private async buildDocumentation(tables: Table[]): Promise<string> {
    // Implementation to build documentation
    throw new Error('Not implemented');
  }
}

// Generate documentation
const generator = new DatabaseDocumentationGenerator();
generator.generateSchemaDocs().catch(console.error);
```

### Team Training Materials

#### Database Access Patterns
```markdown
# Database Access Patterns

## Tenant Isolation
Always use tenant context when accessing data:
```sql
SET app.current_tenant_id = 'tenant-uuid';
SELECT * FROM projects WHERE tenant_id = get_current_tenant_id();
```

## Security Best Practices
- Never bypass RLS policies
- Always validate user permissions
- Use parameterized queries
- Implement proper error handling

## Performance Guidelines
- Use appropriate indexes
- Limit result sets with pagination
- Optimize queries for tenant filtering
- Monitor query performance
```

---

This comprehensive database implementation and migration strategy ensures a secure, performant, and maintainable multi-tenant database architecture for the CIN7 AI Playground platform.

The next step is to establish the testing strategy and quality gates to ensure the reliability of the implementation.