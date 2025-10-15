# CIN7 AI Playground - Phase 1 Task Breakdown

## Overview

This document provides a detailed breakdown of all development tasks for Phase 1, organized by sprint and story. Each task includes specific requirements, acceptance criteria, and estimated effort.

## Sprint 1: Multi-Tenant Foundation (Weeks 1-2)

### Story 1.1: Database Multi-Tenancy (21 points)

#### Task 1.1.1: Database Schema Analysis
**Points**: 2 | **Estimated Hours**: 4 | **Assignee**: Backend Developer

**Description**: Analyze existing database schema and identify all tables that need tenant isolation.

**Requirements**:
- Review current database structure
- Identify tables requiring tenant_id columns
- Document schema changes needed
- Plan data migration strategy

**Acceptance Criteria**:
- [ ] Comprehensive schema analysis document created
- [ ] List of tables requiring tenant isolation identified
- [ ] Impact assessment on existing data completed
- [ ] Migration strategy documented

**Deliverables**:
- Database schema analysis document
- Tenant isolation requirements document
- Data migration plan

---

#### Task 1.1.2: Add Tenant Columns to Core Tables
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Add tenant_id columns and foreign key constraints to all core tables.

**Requirements**:
- Add tenant_id UUID column to users, projects, files tables
- Add tenant_id foreign key constraints
- Create tenant-based unique constraints
- Update database indexes for tenant queries

**Acceptance Criteria**:
- [ ] tenant_id columns added to all required tables
- [ ] Foreign key constraints implemented correctly
- [ ] Unique constraints updated for tenant isolation
- [ ] Database indexes created for tenant-based queries
- [ ] Migration scripts created and tested

**SQL Implementation**:
```sql
-- Add tenant_id to users table
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to projects table
ALTER TABLE projects ADD COLUMN tenant_id UUID REFERENCES tenants(id) NOT NULL;

-- Add tenant_id to project_files table
ALTER TABLE project_files ADD COLUMN tenant_id UUID REFERENCES tenants(id) NOT NULL;

-- Create tenant-based indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_files_tenant ON project_files(tenant_id);
```

---

#### Task 1.1.3: Implement Row-Level Security Policies
**Points**: 5 | **Estimated Hours**: 10 | **Assignee**: Backend Developer

**Description**: Implement comprehensive RLS policies for all tables to ensure tenant isolation.

**Requirements**:
- Enable RLS on all tables
- Create tenant isolation policies
- Implement user access policies
- Test cross-tenant access prevention

**Acceptance Criteria**:
- [ ] RLS enabled on all tables
- [ ] Tenant isolation policies prevent cross-tenant access
- [ ] User access policies allow proper access within tenant
- [ ] RLS policies tested with security scenarios
- [ ] Policy documentation created

**SQL Implementation**:
```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for projects
CREATE POLICY "Tenant isolation for projects" ON projects
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- User access policy for projects
CREATE POLICY "Users can access their tenant projects" ON projects
    FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM project_collaborators pc
                WHERE pc.project_id = projects.id
                AND pc.user_id = auth.uid()
            )
        )
    );
```

---

#### Task 1.1.4: Create Tenant Migration Script
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Create migration script to transform existing single-user data to multi-tenant structure.

**Requirements**:
- Create default tenant for existing data
- Migrate existing users to default tenant
- Update all foreign key relationships
- Create rollback migration

**Acceptance Criteria**:
- [ ] Migration script created and tested
- [ ] Default tenant created for existing data
- [ ] All existing data migrated successfully
- [ ] Rollback script created and tested
- [ ] Migration documentation completed

**SQL Implementation**:
```sql
-- Create default tenant
INSERT INTO tenants (id, name, slug, domain, created_at)
VALUES (
    gen_random_uuid(),
    'Default Tenant',
    'default',
    '@cin7.com',
    NOW()
) RETURNING id;

-- Update existing users with default tenant
UPDATE users
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default')
WHERE tenant_id IS NULL;

-- Update existing projects with user tenant
UPDATE projects
SET tenant_id = (SELECT tenant_id FROM users WHERE users.id = projects.created_by)
WHERE tenant_id IS NULL;
```

---

#### Task 1.1.5: Database Security Testing
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: QA Engineer

**Description**: Implement comprehensive tests to verify tenant isolation and data security.

**Requirements**:
- Create test scenarios for cross-tenant access
- Implement automated security tests
- Test RLS policy effectiveness
- Verify data isolation

**Acceptance Criteria**:
- [ ] Cross-tenant access test scenarios created
- [ ] Automated security tests implemented
- [ ] All RLS policies tested and verified
- [ ] Data isolation confirmed for all tables
- [ ] Security test report generated

**Test Implementation**:
```typescript
// Example security test
describe('Tenant Isolation Security', () => {
  test('users cannot access other tenant projects', async () => {
    const tenant1User = await createTestUser('tenant1');
    const tenant2User = await createTestUser('tenant2');
    const tenant1Project = await createTestProject(tenant1User, 'tenant1');

    // Attempt to access project from different tenant
    const result = await supabase
      .from('projects')
      .select('*')
      .eq('id', tenant1Project.id)
      .setSession(tenant2User.session);

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeNull();
  });
});
```

---

### Story 1.2: Tenant Management System (13 points)

#### Task 1.2.1: Create Tenant Management API
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Backend Developer

**Description**: Implement API endpoints for tenant CRUD operations.

**Requirements**:
- Create tenant creation endpoint
- Implement tenant update/delete operations
- Add tenant retrieval endpoints
- Implement tenant validation logic

**Acceptance Criteria**:
- [ ] POST /api/tenants endpoint implemented
- [ ] GET /api/tenants/:id endpoint implemented
- [ ] PUT /api/tenants/:id endpoint implemented
- [ ] DELETE /api/tenants/:id endpoint implemented
- [ ] Input validation implemented for all endpoints
- [ ] API documentation created

**API Implementation**:
```typescript
// Supabase Edge Function for tenant creation
export default async function createTenant(req: Request) {
  const { name, slug, settings } = await req.json();

  // Validate input
  if (!name || !slug) {
    return new Response(
      JSON.stringify({ error: 'Name and slug are required' }),
      { status: 400 }
    );
  }

  // Check if slug is unique
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existingTenant) {
    return new Response(
      JSON.stringify({ error: 'Tenant slug already exists' }),
      { status: 409 }
    );
  }

  // Create tenant
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert([{ name, slug, settings }])
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ data: tenant }),
    { status: 201 }
  );
}
```

---

#### Task 1.2.2: Implement Tenant Validation Logic
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement validation logic for tenant operations and business rules.

**Requirements**:
- Implement tenant name and slug validation
- Add tenant user limit enforcement
- Create tenant status validation
- Implement tenant settings validation

**Acceptance Criteria**:
- [ ] Tenant name validation implemented
- [ ] Tenant slug validation with unique constraint
- [ ] User limit enforcement implemented
- [ ] Tenant status validation implemented
- [ ] Settings validation implemented
- [ ] Validation error messages provided

**Validation Implementation**:
```typescript
export class TenantValidator {
  static validateTenantName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Tenant name is required' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Tenant name must be 100 characters or less' };
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return { valid: false, error: 'Tenant name contains invalid characters' };
    }

    return { valid: true };
  }

  static validateTenantSlug(slug: string): ValidationResult {
    if (!slug || slug.trim().length === 0) {
      return { valid: false, error: 'Tenant slug is required' };
    }

    if (!/^[a-z0-9\-]+$/.test(slug)) {
      return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
    }

    if (slug.length < 3 || slug.length > 50) {
      return { valid: false, error: 'Slug must be between 3 and 50 characters' };
    }

    return { valid: true };
  }
}
```

---

#### Task 1.2.3: Build Tenant Management UI
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Frontend Developer

**Description**: Create user interface for tenant management operations.

**Requirements**:
- Create tenant creation form
- Build tenant list/management page
- Implement tenant editing interface
- Add tenant status indicators

**Acceptance Criteria**:
- [ ] Tenant creation form with validation
- [ ] Tenant list with search and filtering
- [ ] Tenant editing interface
- [ ] Tenant status indicators
- [ ] Responsive design implementation
- [ ] Loading states and error handling

**UI Implementation**:
```tsx
interface TenantManagementProps {
  onTenantCreated?: (tenant: Tenant) => void;
}

export const TenantManagement: React.FC<TenantManagementProps> = ({
  onTenantCreated
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTenant = async (tenantData: CreateTenantRequest) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single();

      if (error) throw error;

      setTenants(prev => [...prev, data]);
      onTenantCreated?.(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Page
      title="Tenant Management"
      subtitle="Manage your organization's tenants"
    >
      <Card>
        <CreateTenantForm onSubmit={handleCreateTenant} />
      </Card>

      <Card>
        <TenantList
          tenants={tenants}
          loading={loading}
          error={error}
        />
      </Card>
    </Page>
  );
};
```

---

#### Task 1.2.4: Implement Tenant Audit Logging
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement audit logging for all tenant operations.

**Requirements**:
- Log tenant creation, updates, and deletions
- Track user who performed operations
- Record timestamp and changes
- Create audit log retrieval API

**Acceptance Criteria**:
- [ ] Tenant operations logged to audit table
- [ ] User attribution recorded for all operations
- [ ] Timestamp and change details captured
- [ ] Audit log retrieval API implemented
- [ ] Audit log retention policy defined

**Audit Implementation**:
```typescript
export class TenantAuditLogger {
  static async logTenantOperation(
    operation: 'create' | 'update' | 'delete',
    tenantId: string,
    userId: string,
    changes?: Record<string, any>
  ) {
    const auditRecord = {
      entity_type: 'tenant',
      entity_id: tenantId,
      operation,
      user_id: userId,
      changes,
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: await this.getUserAgent()
    };

    await supabase
      .from('audit_logs')
      .insert([auditRecord]);
  }
}
```

---

### Story 1.3: Security Framework Implementation (16 points)

#### Task 1.3.1: Implement API Security Middleware
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Backend Developer

**Description**: Create middleware for API security including tenant validation and authentication.

**Requirements**:
- Implement authentication middleware
- Add tenant validation middleware
- Create request rate limiting
- Implement CORS configuration

**Acceptance Criteria**:
- [ ] Authentication middleware validates user tokens
- [ ] Tenant validation middleware checks user access
- [ ] Rate limiting prevents API abuse
- [ ] CORS properly configured for frontend
- [ ] Security headers implemented

**Middleware Implementation**:
```typescript
export const securityMiddleware = async (req: Request) => {
  // Validate authentication
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response('Invalid token', { status: 401 });
  }

  // Set tenant context for RLS
  const tenantId = await getUserTenantId(user.id);
  if (!tenantId) {
    return new Response('No tenant access', { status: 403 });
  }

  // Set tenant context for RLS policies
  await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

  // Continue with request
  return null; // Let the request continue
};
```

---

#### Task 1.3.2: Create Tenant Context System
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement tenant context system for database operations and API requests.

**Requirements**:
- Create tenant context setting function
- Implement tenant context retrieval
- Add tenant context validation
- Create tenant context middleware

**Acceptance Criteria**:
- [ ] Tenant context set for authenticated users
- [ ] Database operations use tenant context
- [ ] Tenant context validated for each request
- [ ] Context properly cleared on logout
- [ ] Error handling for invalid contexts

**Context Implementation**:
```sql
-- Function to set tenant context for RLS
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
```

---

#### Task 1.3.3: Implement WebSocket Security
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Secure WebSocket connections with tenant isolation and authentication.

**Requirements**:
- Authenticate WebSocket connections
- Validate tenant access for WebSocket
- Implement WebSocket rate limiting
- Create secure channel management

**Acceptance Criteria**:
- [ ] WebSocket connections authenticated
- [ ] Tenant access validated for WebSocket
- [ ] WebSocket rate limiting implemented
- [ ] Secure channel management
- [ ] Connection monitoring and logging

**WebSocket Security Implementation**:
```typescript
export class WebSocketSecurity {
  static async authenticateConnection(token: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase.auth.getUser(token);
      return user || null;
    } catch {
      return null;
    }
  }

  static async validateTenantAccess(user: User, projectId: string): Promise<boolean> {
    const { data: project } = await supabase
      .from('projects')
      .select('tenant_id')
      .eq('id', projectId)
      .single();

    if (!project) return false;

    const { data: membership } = await supabase
      .from('user_tenant_membership')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', project.tenant_id)
      .single();

    return !!membership;
  }
}
```

---

#### Task 1.3.4: Create Security Testing Suite
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: QA Engineer

**Description**: Implement comprehensive security testing for tenant isolation and API security.

**Requirements**:
- Create security test scenarios
- Implement automated penetration tests
- Test authentication and authorization
- Verify tenant isolation effectiveness

**Acceptance Criteria**:
- [ ] Security test scenarios implemented
- [ ] Authentication flows tested
- [ ] Authorization controls verified
- [ ] Tenant isolation tested extensively
- [ ] Security test report generated

**Security Test Implementation**:
```typescript
describe('Security Framework Tests', () => {
  describe('Authentication Security', () => {
    test('rejects requests without valid token', async () => {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': 'invalid-token' }
      });

      expect(response.status).toBe(401);
    });

    test('validates token format and expiration', async () => {
      const expiredToken = generateExpiredToken();
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${expiredToken}` }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Tenant Isolation Security', () => {
    test('prevents cross-tenant data access', async () => {
      const tenant1User = await createTestUser('tenant1');
      const tenant2Project = await createTestProject('tenant2');

      const response = await fetch(`/api/projects/${tenant2Project.id}`, {
        headers: { 'Authorization': `Bearer ${tenant1User.token}` }
      });

      expect(response.status).toBe(404);
    });
  });
});
```

---

#### Task 1.3.5: Document Security Architecture
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Tech Lead

**Description**: Create comprehensive documentation for security architecture and best practices.

**Requirements**:
- Document security architecture decisions
- Create security implementation guide
- Document RLS policy patterns
- Create security testing procedures

**Acceptance Criteria**:
- [ ] Security architecture document created
- [ ] Implementation guide completed
- [ ] RLS policy patterns documented
- [ ] Security testing procedures defined
- [ ] Security best practices guide created

---

## Sprint 2: Authentication & User Management (Weeks 3-4)

### Story 2.1: @cin7.com Domain Authentication (21 points)

#### Task 2.1.1: Configure Supabase Auth with Domain Validation
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Backend Developer

**Description**: Configure Supabase authentication with @cin7.com domain restriction.

**Requirements**:
- Configure Supabase Auth providers
- Implement @cin7.com email validation
- Set up email verification templates
- Configure password policies

**Acceptance Criteria**:
- [ ] Supabase Auth configured for email/password
- [ ] @cin7.com domain validation implemented
- [ ] Email verification workflow configured
- [ ] Password policies implemented
- [ ] Auth configuration documented

**Configuration Implementation**:
```typescript
// Supabase Auth configuration
export const authConfig = {
  providers: {
    email: {
      enabled: true,
      requireEmailConfirmation: true,
      domainWhitelist: ['@cin7.com']
    }
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialCharacters: false
  }
};

// Domain validation function
export const validateEmailDomain = (email: string): boolean => {
  const allowedDomains = ['@cin7.com'];
  return allowedDomains.some(domain => email.endsWith(domain));
};
```

---

#### Task 2.1.2: Implement Email Verification Workflow
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement email verification workflow for new user registration.

**Requirements**:
- Create email verification templates
- Implement verification email sending
- Build verification token handling
- Create verification status tracking

**Acceptance Criteria**:
- [ ] Email verification templates created
- [ ] Verification emails sent automatically
- [ ] Verification tokens validated correctly
- [ ] Verification status tracked
- [ ] Resend verification functionality

**Email Verification Implementation**:
```typescript
export class EmailVerificationService {
  static async sendVerificationEmail(email: string): Promise<void> {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL}/auth/verify`
      }
    });

    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  static async verifyEmail(token: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });

    if (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }
}
```

---

#### Task 2.1.3: Create Authentication UI Components
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Frontend Developer

**Description**: Build user interface components for authentication flows.

**Requirements**:
- Create sign-in form component
- Build sign-up form component
- Implement email verification UI
- Create password reset interface

**Acceptance Criteria**:
- [ ] Sign-in form with validation
- [ ] Sign-up form with domain validation
- [ ] Email verification interface
- [ ] Password reset form
- [ ] Loading states and error handling
- [ ] Responsive design

**Authentication UI Implementation**:
```tsx
interface SignInFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSuccess,
  onError
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      onSuccess?.(data.user);
    } catch (err) {
      const errorMessage = err.message || 'Sign in failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="your.email@cin7.com"
          required
          disabled={loading}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          disabled={loading}
        />

        {error && (
          <Banner status="critical">
            {error}
          </Banner>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!email || !password}
        >
          Sign In
        </Button>
      </Form>
    </Card>
  );
};
```

---

#### Task 2.1.4: Implement Session Management
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement secure session management with refresh tokens and proper timeout.

**Requirements**:
- Configure session timeout policies
- Implement refresh token handling
- Create session monitoring
- Build secure logout functionality

**Acceptance Criteria**:
- [ ] Session timeout configured (24 hours)
- [ ] Refresh tokens handled automatically
- [ ] Session monitoring implemented
- [ ] Secure logout functionality
- [ ] Multiple session management

**Session Management Implementation**:
```typescript
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static async initializeSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const isExpired = this.isSessionExpired(session);
      if (isExpired) {
        await this.refreshSession();
      }
    }
  }

  static async refreshSession(): Promise<void> {
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      await this.signOut();
      throw new Error('Session refresh failed');
    }
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
    // Clear local storage, redirect to login, etc.
  }

  private static isSessionExpired(session: Session): boolean {
    const expiresAt = session.expires_at! * 1000;
    return Date.now() >= expiresAt;
  }
}
```

---

#### Task 2.1.5: Create Authentication Testing Suite
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: QA Engineer

**Description**: Implement comprehensive testing for authentication flows and security.

**Requirements**:
- Test authentication flow scenarios
- Verify domain validation
- Test session management
- Validate security measures

**Acceptance Criteria**:
- [ ] Authentication flows tested end-to-end
- [ ] Domain validation tested thoroughly
- [ ] Session management verified
- [ ] Security measures validated
- [ ] Test coverage >90%

**Authentication Testing Implementation**:
```typescript
describe('Authentication Flow Tests', () => {
  describe('Email Domain Validation', () => {
    test('allows @cin7.com email addresses', async () => {
      const result = await signUp('test.user@cin7.com', 'password123');
      expect(result.success).toBe(true);
    });

    test('rejects non-cin7.com email addresses', async () => {
      const result = await signUp('test.user@gmail.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email domain not allowed');
    });
  });

  describe('Session Management', () => {
    test('maintains session across page reloads', async () => {
      await signIn('test@cin7.com', 'password123');

      // Simulate page reload
      await SessionManager.initializeSession();

      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeTruthy();
    });

    test('automatically refreshes expired sessions', async () => {
      // Create expired session
      await createExpiredSession('test@cin7.com');

      await SessionManager.initializeSession();

      const { data: { session } } = await supabase.auth.getSession();
      expect(session?.expires_at! * 1000).toBeGreaterThan(Date.now());
    });
  });
});
```

---

### Story 2.2: User Profile Management (13 points)

#### Task 2.2.1: Create User Profile API
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement API endpoints for user profile management.

**Requirements**:
- Create user profile CRUD endpoints
- Implement profile validation
- Add profile image upload
- Create preferences management

**Acceptance Criteria**:
- [ ] GET /api/users/profile endpoint
- [ ] PUT /api/users/profile endpoint
- [ ] Profile validation implemented
- [ ] Avatar upload functionality
- [ ] Preferences management API

**Profile API Implementation**:
```typescript
export default async function updateUserProfile(req: Request) {
  const { name, avatar_url, preferences } = await req.json();
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  // Authenticate user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Update profile
  const updates: any = {};
  if (name) updates.name = name;
  if (avatar_url) updates.avatar_url = avatar_url;
  if (preferences) updates.preferences = preferences;

  const { data: profile, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    return new Response(
      JSON.stringify({ error: updateError.message }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ data: profile }),
    { status: 200 }
  );
}
```

---

#### Task 2.2.2: Build User Profile UI
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Frontend Developer

**Description**: Create user interface for profile management.

**Requirements**:
- Create profile editing form
- Build avatar upload interface
- Implement preferences management UI
- Add profile validation

**Acceptance Criteria**:
- [ ] Profile editing form with validation
- [ ] Avatar upload with preview
- [ ] Preferences management interface
- [ ] Real-time validation feedback
- [ ] Responsive design

**Profile UI Implementation**:
```tsx
export const ProfileSettings: React.FC = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarUpload = async (file: File) => {
    // Upload avatar to Supabase storage
    const filePath = `avatars/${profile!.id}/${file.name}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setAvatarPreview(publicUrl);

    // Update profile with new avatar
    await updateProfile({ avatar_url: publicUrl });
  };

  return (
    <Page title="Profile Settings">
      <Card>
        <Form onSubmit={handleSaveProfile}>
          <AvatarUpload
            currentAvatar={profile?.avatar_url}
            preview={avatarPreview}
            onUpload={handleAvatarUpload}
          />

          <TextField
            label="Full Name"
            value={profile?.name || ''}
            onChange={(value) => setProfile(prev => prev ? { ...prev, name: value } : null)}
            placeholder="Enter your full name"
          />

          <PreferencesSection
            preferences={profile?.preferences || {}}
            onChange={(preferences) => setProfile(prev => prev ? { ...prev, preferences } : null)}
          />

          <Button
            type="submit"
            variant="primary"
            loading={saving}
          >
            Save Profile
          </Button>
        </Form>
      </Card>
    </Page>
  );
};
```

---

#### Task 2.2.3: Implement User Preferences System
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Create user preferences system for application customization.

**Requirements**:
- Define preference schema
- Implement preference storage
- Create preference validation
- Build preference defaults

**Acceptance Criteria**:
- [ ] Preference schema defined
- [ ] Preferences stored in JSONB format
- [ ] Preference validation implemented
- [ ] Default preferences applied
- [ ] Preference migration system

**Preferences Implementation**:
```typescript
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr';
  notifications: {
    email: boolean;
    push: boolean;
    project_updates: boolean;
    ai_responses: boolean;
  };
  editor: {
    theme: 'light' | 'dark';
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    itemsPerPage: number;
    showArchived: boolean;
  };
}

export class PreferencesManager {
  private static readonly DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      project_updates: true,
      ai_responses: true
    },
    editor: {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
      wordWrap: true
    },
    dashboard: {
      layout: 'grid',
      itemsPerPage: 12,
      showArchived: false
    }
  };

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data: user } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    return {
      ...this.DEFAULT_PREFERENCES,
      ...(user?.preferences || {})
    };
  }

  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const currentPrefs = await this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };

    const { error } = await supabase
      .from('users')
      .update({ preferences: updatedPrefs })
      .eq('id', userId);

    if (error) throw error;

    return updatedPrefs;
  }
}
```

---

#### Task 2.2.4: Create User Activity Tracking
**Points**: 2 | **Estimated Hours**: 4 | **Assignee**: Backend Developer

**Description**: Implement user activity tracking for engagement analytics.

**Requirements**:
- Track user login/logout activity
- Monitor feature usage
- Create activity aggregation
- Implement activity retention

**Acceptance Criteria**:
- [ ] Login/logout tracking implemented
- [ ] Feature usage tracking
- [ ] Activity aggregation system
- [ ] Activity data retention policy
- [ ] Activity dashboard for admins

**Activity Tracking Implementation**:
```typescript
export class ActivityTracker {
  static async trackUserActivity(
    userId: string,
    activity: {
      type: 'login' | 'logout' | 'project_create' | 'file_edit' | 'ai_generate';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const activityRecord = {
      user_id: userId,
      activity_type: activity.type,
      metadata: activity.metadata || {},
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: await this.getUserAgent()
    };

    await supabase
      .from('user_activities')
      .insert([activityRecord]);
  }

  static async getUserActivitySummary(
    userId: string,
    timeframe: 'day' | 'week' | 'month'
  ): Promise<ActivitySummary> {
    const { data } = await supabase
      .rpc('get_user_activity_summary', {
        p_user_id: userId,
        p_timeframe: timeframe
      });

    return data;
  }
}
```

---

#### Task 2.2.5: Implement Profile Testing Suite
**Points**: 2 | **Estimated Hours**: 4 | **Assignee**: QA Engineer

**Description**: Create comprehensive testing for user profile functionality.

**Requirements**:
- Test profile CRUD operations
- Validate avatar upload functionality
- Test preferences management
- Verify activity tracking

**Acceptance Criteria**:
- [ ] Profile operations tested
- [ ] Avatar upload tested
- [ ] Preferences management verified
- [ ] Activity tracking validated
- [ ] Test coverage >90%

---

### Story 2.3: Tenant Membership System (16 points)

#### Task 2.3.1: Create Invitation System
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Backend Developer

**Description**: Implement user invitation system for tenant membership.

**Requirements**:
- Create invitation workflow
- Implement email invitation sending
- Build invitation token management
- Create invitation acceptance flow

**Acceptance Criteria**:
- [ ] Invitation creation API
- [ ] Email invitation sending
- [ ] Invitation token validation
- [ ] Invitation acceptance workflow
- [ ] Invitation expiration handling

**Invitation System Implementation**:
```typescript
export class InvitationService {
  static async createInvitation(
    tenantId: string,
    invitedBy: string,
    email: string,
    role: 'member' | 'admin' = 'member'
  ): Promise<Invitation> {
    // Validate email domain
    if (!email.endsWith('@cin7.com')) {
      throw new Error('Only @cin7.com email addresses can be invited');
    }

    // Create invitation token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const { data: invitation, error } = await supabase
      .from('tenant_invitations')
      .insert([{
        tenant_id: tenantId,
        email,
        role,
        token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Send invitation email
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  static async acceptInvitation(token: string, userId: string): Promise<void> {
    const { data: invitation, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('token', token)
      .eq('email', (await supabase.auth.getUser(userId)).user?.email)
      .single();

    if (error || !invitation) {
      throw new Error('Invalid invitation');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Add user to tenant
    await supabase
      .from('user_tenant_membership')
      .insert([{
        user_id: userId,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        joined_at: new Date().toISOString()
      }]);

    // Delete invitation
    await supabase
      .from('tenant_invitations')
      .delete()
      .eq('id', invitation.id);
  }
}
```

---

#### Task 2.3.2: Implement Role-Based Access Control
**Points**: 4 | **Estimated Hours**: 8 | **Assignee**: Backend Developer

**Description**: Create comprehensive RBAC system for tenant permissions.

**Requirements**:
- Define role hierarchy and permissions
- Implement permission checking system
- Create role assignment API
- Build permission validation middleware

**Acceptance Criteria**:
- [ ] Role hierarchy defined
- [ ] Permission system implemented
- [ ] Role assignment API created
- [ ] Permission validation middleware
- [ ] Role inheritance working

**RBAC Implementation**:
```typescript
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum Permission {
  // Tenant permissions
  MANAGE_TENANT = 'tenant:manage',
  INVITE_USERS = 'tenant:invite',
  VIEW_TENANT_SETTINGS = 'tenant:view_settings',

  // Project permissions
  CREATE_PROJECTS = 'project:create',
  EDIT_OWN_PROJECTS = 'project:edit_own',
  EDIT_ALL_PROJECTS = 'project:edit_all',
  DELETE_OWN_PROJECTS = 'project:delete_own',
  DELETE_ALL_PROJECTS = 'project:delete_all',
  VIEW_PROJECTS = 'project:view',

  // User permissions
  MANAGE_USERS = 'user:manage',
  VIEW_USERS = 'user:view'
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.MANAGE_TENANT,
    Permission.INVITE_USERS,
    Permission.VIEW_TENANT_SETTINGS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_OWN_PROJECTS,
    Permission.EDIT_ALL_PROJECTS,
    Permission.DELETE_OWN_PROJECTS,
    Permission.DELETE_ALL_PROJECTS,
    Permission.VIEW_PROJECTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS
  ],
  [Role.ADMIN]: [
    Permission.INVITE_USERS,
    Permission.VIEW_TENANT_SETTINGS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_OWN_PROJECTS,
    Permission.EDIT_ALL_PROJECTS,
    Permission.DELETE_OWN_PROJECTS,
    Permission.VIEW_PROJECTS,
    Permission.VIEW_USERS
  ],
  [Role.MEMBER]: [
    Permission.CREATE_PROJECTS,
    Permission.EDIT_OWN_PROJECTS,
    Permission.DELETE_OWN_PROJECTS,
    Permission.VIEW_PROJECTS
  ],
  [Role.VIEWER]: [
    Permission.VIEW_PROJECTS
  ]
};

export class AuthorizationService {
  static async hasPermission(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<boolean> {
    const { data: membership } = await supabase
      .from('user_tenant_membership')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) return false;

    const userPermissions = ROLE_PERMISSIONS[membership.role as Role];
    return userPermissions.includes(permission);
  }

  static async requirePermission(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, tenantId, permission);

    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}
```

---

#### Task 2.3.3: Build Membership Management UI
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Frontend Developer

**Description**: Create user interface for tenant membership management.

**Requirements**:
- Create member invitation interface
- Build member list with roles
- Implement role management UI
- Add member removal functionality

**Acceptance Criteria**:
- [ ] Member invitation form
- [ ] Member list with search/filter
- [ ] Role management interface
- [ ] Member removal confirmation
- [ ] Activity indicators for members

**Membership UI Implementation**:
```tsx
export const TenantMembership: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const handleInviteMember = async (email: string, role: Role) => {
    try {
      const invitation = await InvitationService.createInvitation(
        tenantId,
        currentUser.id,
        email,
        role
      );

      setInvitations(prev => [...prev, invitation]);

      // Show success notification
      showNotification('Invitation sent successfully', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: Role) => {
    try {
      await supabase
        .from('user_tenant_membership')
        .update({ role: newRole })
        .eq('id', memberId);

      setMembers(prev =>
        prev.map(member =>
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );
    } catch (error) {
      showNotification('Failed to update member role', 'error');
    }
  };

  return (
    <Page title="Team Members">
      <Card>
        <InviteMemberForm onInvite={handleInviteMember} />
      </Card>

      <Card>
        <MemberList
          members={members}
          invitations={invitations}
          onRoleUpdate={handleUpdateMemberRole}
          onRemoveMember={handleRemoveMember}
        />
      </Card>
    </Page>
  );
};
```

---

#### Task 2.3.4: Create Membership Audit System
**Points**: 3 | **Estimated Hours**: 6 | **Assignee**: Backend Developer

**Description**: Implement audit logging for all membership changes.

**Requirements**:
- Log membership invitations
- Track role changes
- Record member removals
- Create audit trail API

**Acceptance Criteria**:
- [ ] All membership changes logged
- [ ] Role changes tracked with attribution
- [ ] Member removals recorded
- [ ] Audit trail API implemented
- [ ] Audit data retention policy

**Membership Audit Implementation**:
```typescript
export class MembershipAuditLogger {
  static async logMembershipChange(
    action: 'invitation_created' | 'invitation_accepted' | 'role_changed' | 'member_removed',
    tenantId: string,
    userId: string,
    changedBy: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditRecord = {
      entity_type: 'membership',
      entity_id: `${tenantId}:${userId}`,
      action,
      tenant_id: tenantId,
      user_id: userId,
      changed_by: changedBy,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: await this.getUserAgent()
    };

    await supabase
      .from('audit_logs')
      .insert([auditRecord]);
  }

  static async getMembershipHistory(
    tenantId: string,
    userId?: string
  ): Promise<AuditRecord[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'membership')
      .eq('tenant_id', tenantId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data } = await query.order('timestamp', { ascending: false });

    return data || [];
  }
}
```

---

#### Task 2.3.5: Implement Membership Testing Suite
**Points**: 2 | **Estimated Hours**: 4 | **Assignee**: QA Engineer

**Description**: Create comprehensive testing for membership functionality.

**Requirements**:
- Test invitation workflow
- Verify role-based permissions
- Test membership management
- Validate audit logging

**Acceptance Criteria**:
- [ ] Invitation workflow tested
- [ ] Role permissions verified
- [ ] Membership management tested
- [ ] Audit logging validated
- [ ] Test coverage >90%

---

## Sprint Summary and Next Steps

### Sprint 1 Deliverables Summary
- ✅ Multi-tenant database foundation with RLS
- ✅ Tenant management system with CRUD operations
- ✅ Security framework with API and WebSocket security
- ✅ Comprehensive security testing suite

### Sprint 2 Deliverables Summary
- ✅ @cin7.com domain authentication system
- ✅ User profile management with preferences
- ✅ Tenant membership system with invitations and RBAC
- ✅ Comprehensive authentication and membership testing

### Success Criteria Check

After completing Sprints 1-2, the following success criteria should be met:

#### Technical Success Criteria
- [x] Multi-tenant database supports 10+ test users
- [x] Security model prevents cross-tenant data access
- [x] User authentication system functional with @cin7.com restriction
- [x] Tenant membership system with role-based access control
- [x] 80%+ test coverage achieved for implemented features
- [x] Security audit passed with no critical issues

#### Process Success Criteria
- [x] Development workflows established
- [x] Code review process implemented
- [x] CI/CD pipeline functional
- [x] Quality gates working
- [x] Team collaboration effective

### Ready for Sprint 3

With Sprints 1-2 completed, the foundation is solid for moving to Sprint 3: Project Management Core. The multi-tenant architecture, authentication system, and security framework provide the necessary infrastructure for building project management features on top.

### Immediate Next Steps

1. **Sprint Retrospective**: Review what went well and identify improvements
2. **Sprint 3 Planning**: Detailed planning for project management features
3. **Environment Preparation**: Ensure development environment is optimized
4. **Team Alignment**: Kick-off meeting for Sprint 3 objectives
5. **Begin Sprint 3**: Start with project CRUD operations

---

This detailed task breakdown provides the foundation for successful implementation of Phase 1. Each task includes specific requirements, acceptance criteria, and implementation details to ensure clarity and accountability throughout the development process.