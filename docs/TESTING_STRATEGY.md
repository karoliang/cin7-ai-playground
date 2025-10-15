# CIN7 AI Playground - Testing Strategy & Quality Gates

## Overview

This comprehensive testing strategy outlines the quality assurance approach for Phase 1 of the CIN7 AI Playground project. It defines testing methodologies, quality gates, automation procedures, and continuous integration requirements to ensure reliable, secure, and performant software delivery.

## Testing Philosophy

### Testing Pyramid

```
    E2E Tests (10%)
   ┌─────────────────┐
  │   Critical User  │
 │     Workflows     │
│   Business Value  │
│─────────────────────────│
│  Integration Tests (30%) │
│   API Endpoints          │
│  Database Integration    │
│ Component Integration    │
│ External Services        │
├─────────────────────────┤
│   Unit Tests (60%)       │
│  Utility Functions       │
│   Service Logic          │
│  Component Behavior      │
│  Business Logic          │
│  Data Models             │
└─────────────────────────┘
```

### Testing Principles

1. **Test Early, Test Often**: Implement tests during development, not after
2. **Automate Everything**: Automate testing, deployment, and quality checks
3. **Quality is Everyone's Responsibility**: Developers write tests, QA ensures coverage
4. **Fast Feedback**: Quick test execution for rapid development cycles
5. **Comprehensive Coverage**: Test all critical paths and edge cases
6. **Continuous Improvement**: Regular review and enhancement of testing practices

## Testing Framework Architecture

### Core Testing Technologies

```yaml
Unit Testing:
  Framework: Vitest
  Language: TypeScript
  Mocking: Vitest Mock
  Coverage: c8/v8
  Assertions: Vitest Expect

Integration Testing:
  Database: Supabase Test Utilities
  API: Supertest
  Authentication: Supabase Auth Test Utils
  External Services: MSW (Mock Service Worker)

End-to-End Testing:
  Framework: Playwright
  Browsers: Chromium, Firefox, Safari
  Reporting: Playwright HTML Reporter
  Visual Testing: Playwright + Percy/Applitools

Performance Testing:
  Load Testing: Artillery
  API Testing: Postman/Newman
  Frontend: Lighthouse CI
  Database: pgbench

Security Testing:
  SAST: ESLint Security Plugin
  DAST: OWASP ZAP
  Dependency Scanning: Snyk/NPM Audit
  Secrets Scanning: GitLeaks
```

### Test Organization Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # React component tests
│   ├── services/           # Service layer tests
│   ├── utils/              # Utility function tests
│   ├── hooks/              # Custom hook tests
│   └── types/              # Type definition tests
├── integration/            # Integration tests
│   ├── api/                # API endpoint tests
│   ├── database/           # Database integration tests
│   ├── auth/               # Authentication flow tests
│   └── external/           # External service integration tests
├── e2e/                    # End-to-end tests
│   ├── auth/               # Authentication workflows
│   ├── projects/           # Project management workflows
│   ├── files/              # File management workflows
│   └── collaboration/      # Multi-user scenarios
├── performance/            # Performance tests
│   ├── load/               # Load testing scenarios
│   ├── stress/             # Stress testing
│   └── api/                # API performance tests
├── security/               # Security tests
│   ├── authentication/     # Auth security tests
│   ├── authorization/      # Permission tests
│   ├── data-isolation/     # Tenant isolation tests
│   └── vulnerabilities/    # Security vulnerability tests
├── fixtures/               # Test data and fixtures
│   ├── users/              # User test data
│   ├── projects/           # Project test data
│   ├── tenants/            # Tenant test data
│   └── common/             # Common test utilities
└── helpers/                # Test helpers and utilities
    ├── database.ts         # Database test utilities
    ├── auth.ts             # Authentication test utilities
    ├── api.ts              # API testing utilities
    └── fixtures.ts         # Fixture management
```

## Unit Testing Strategy

### Component Testing

#### React Component Testing
```typescript
// tests/unit/components/ProjectCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectCard } from '@/components/project/ProjectCard';
import { mockProject, mockUser } from '@/tests/fixtures/projects';

describe('ProjectCard Component', () => {
  const defaultProps = {
    project: mockProject,
    currentUser: mockUser,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onOpen: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project information correctly', () => {
    render(<ProjectCard {...defaultProps} />);

    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    expect(screen.getByText(mockProject.description)).toBeInTheDocument();
    expect(screen.getByText(mockProject.framework)).toBeInTheDocument();
  });

  it('handles edit action when user has permission', async () => {
    render(<ProjectCard {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockProject.id);
    });
  });

  it('does not show edit button when user lacks permission', () => {
    const readOnlyUser = { ...mockUser, role: 'viewer' };
    render(<ProjectCard {...defaultProps} currentUser={readOnlyUser} />);

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('displays project status with correct styling', () => {
    const activeProject = { ...mockProject, status: 'active' };
    render(<ProjectCard {...defaultProps} project={activeProject} />);

    const statusBadge = screen.getByTestId('project-status');
    expect(statusBadge).toHaveClass('status-active');
  });

  it('handles deletion with confirmation', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ProjectCard {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockProject.id);
    });

    mockConfirm.mockRestore();
  });
});
```

#### Custom Hook Testing
```typescript
// tests/unit/hooks/useProjectManagement.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useProjectManagement } from '@/hooks/useProjectManagement';
import { mockSupabaseClient } from '@/tests/helpers/database';

describe('useProjectManagement Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.clearMocks();
  });

  it('loads projects on mount', async () => {
    const mockProjects = [mockProject, mockProject2];
    mockSupabaseClient
      .from('projects')
      .select()
      .mockResolvedValue({ data: mockProjects, error: null });

    const { result } = renderHook(() => useProjectManagement());

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles project creation', async () => {
    const newProject = { name: 'New Project', description: 'Test' };
    const createdProject = { ...newProject, id: 'new-id' };

    mockSupabaseClient
      .from('projects')
      .insert()
      .select()
      .single()
      .mockResolvedValue({ data: createdProject, error: null });

    const { result } = renderHook(() => useProjectManagement());

    await act(async () => {
      await result.current.createProject(newProject);
    });

    expect(result.current.projects).toContainEqual(createdProject);
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Database error';
    mockSupabaseClient
      .from('projects')
      .select()
      .mockResolvedValue({ data: null, error: { message: errorMessage } });

    const { result } = renderHook(() => useProjectManagement());

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### Service Layer Testing

#### API Service Testing
```typescript
// tests/unit/services/projectService.test.ts
import { projectService } from '@/services/projectService';
import { mockSupabaseClient } from '@/tests/helpers/database';
import { mockProject, mockTenantId } from '@/tests/fixtures/projects';

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.clearMocks();
  });

  describe('getProjects', () => {
    it('fetches projects for current tenant', async () => {
      const mockProjects = [mockProject];

      mockSupabaseClient
        .from('projects')
        .select()
        .eq('tenant_id', mockTenantId)
        .mockResolvedValue({ data: mockProjects, error: null });

      const result = await projectService.getProjects(mockTenantId);

      expect(result).toEqual(mockProjects);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('projects');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', mockTenantId);
    });

    it('applies filters correctly', async () => {
      const filters = { status: 'active', framework: 'react' };

      mockSupabaseClient
        .from('projects')
        .select()
        .eq('tenant_id', mockTenantId)
        .eq('status', filters.status)
        .eq('framework', filters.framework)
        .mockResolvedValue({ data: [], error: null });

      await projectService.getProjects(mockTenantId, filters);

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', filters.status);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('framework', filters.framework);
    });
  });

  describe('createProject', () => {
    it('creates project with correct data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        framework: 'react' as const
      };

      mockSupabaseClient
        .from('projects')
        .insert()
        .select()
        .single()
        .mockResolvedValue({ data: mockProject, error: null });

      const result = await projectService.createProject(projectData, mockTenantId, 'user-id');

      expect(result).toEqual(mockProject);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        ...projectData,
        tenant_id: mockTenantId,
        created_by: 'user-id'
      });
    });

    it('throws error on failure', async () => {
      const errorMessage = 'Creation failed';
      const projectData = { name: 'Test' };

      mockSupabaseClient
        .from('projects')
        .insert()
        .mockResolvedValue({ data: null, error: { message: errorMessage } });

      await expect(projectService.createProject(projectData, mockTenantId, 'user-id'))
        .rejects.toThrow(errorMessage);
    });
  });
});
```

### Utility Function Testing

#### Validation Utilities
```typescript
// tests/unit/utils/validation.test.ts
import { validateEmail, validateProjectName, validateTenantSlug } from '@/utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('validates correct @cin7.com emails', () => {
      expect(validateEmail('user@cin7.com')).toBe(true);
      expect(validateEmail('test.user@cin7.com')).toBe(true);
    });

    it('rejects non-cin7.com emails', () => {
      expect(validateEmail('user@gmail.com')).toBe(false);
      expect(validateEmail('user@yahoo.com')).toBe(false);
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@cin7.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validateProjectName', () => {
    it('accepts valid project names', () => {
      expect(validateProjectName('My Project')).toBe(true);
      expect(validateProjectName('Project 123')).toBe(true);
      expect(validateProjectName('My-Project_Name')).toBe(true);
    });

    it('rejects invalid project names', () => {
      expect(validateProjectName('')).toBe(false);
      expect(validateProjectName('A'.repeat(101))).toBe(false);
      expect(validateProjectName('Project@123')).toBe(false);
    });
  });

  describe('validateTenantSlug', () => {
    it('accepts valid slugs', () => {
      expect(validateTenantSlug('my-tenant')).toBe(true);
      expect(validateTenantSlug('tenant123')).toBe(true);
      expect(validateTenantSlug('test-tenant-name')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(validateTenantSlug('My-Tenant')).toBe(false);
      expect(validateTenantSlug('tenant_name')).toBe(false);
      expect(validateTenantSlug('tenant@name')).toBe(false);
      expect(validateTenantSlug('ab')).toBe(false); // Too short
      expect(validateTenantSlug('a'.repeat(51))).toBe(false); // Too long
    });
  });
});
```

## Integration Testing Strategy

### Database Integration Testing

#### Database Test Utilities
```typescript
// tests/helpers/database.ts
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.test' });

export class TestDatabaseManager {
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  async setupTestTenant(): Promise<{ tenant: any; user: any; token: string }> {
    // Create test tenant
    const { data: tenant } = await this.supabase
      .from('tenants')
      .insert([{
        name: 'Test Tenant',
        slug: 'test-tenant',
        domain: '@cin7.com'
      }])
      .select()
      .single();

    // Create test user
    const { data: user } = await this.supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
      options: {
        data: { tenant_id: tenant.id }
      }
    });

    // Create tenant membership
    await this.supabase
      .from('user_tenant_membership')
      .insert([{
        user_id: user.user.id,
        tenant_id: tenant.id,
        role: 'owner'
      }]);

    // Get auth token
    const { data: { session } } = await this.supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    return { tenant, user: user.user, token: session.access_token };
  }

  async cleanupTestData(tenantId: string): Promise<void> {
    // Clean up in reverse order of dependencies
    await this.supabase
      .from('real_time_sessions')
      .delete()
      .eq('tenant_id', tenantId);

    await this.supabase
      .from('chat_messages')
      .delete()
      .eq('tenant_id', tenantId);

    await this.supabase
      .from('project_files')
      .delete()
      .eq('tenant_id', tenantId);

    await this.supabase
      .from('projects')
      .delete()
      .eq('tenant_id', tenantId);

    await this.supabase
      .from('user_tenant_membership')
      .delete()
      .eq('tenant_id', tenantId);

    await this.supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);
  }

  async createTestProject(tenantId: string, userId: string): Promise<any> {
    const { data } = await this.supabase
      .from('projects')
      .insert([{
        name: 'Test Project',
        description: 'Test Description',
        tenant_id: tenantId,
        created_by: userId
      }])
      .select()
      .single();

    return data;
  }
}

export const testDb = new TestDatabaseManager();
```

#### Multi-Tenant Isolation Tests
```typescript
// tests/integration/database/tenant-isolation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb } from '@/tests/helpers/database';
import { createClient } from '@supabase/supabase-js';

describe('Tenant Isolation', () => {
  let tenant1: any, tenant2: any;
  let user1: any, user2: any;
  let token1: string, token2: string;
  let client1: any, client2: any;

  beforeEach(async () => {
    // Setup two separate tenants with users
    ({ tenant: tenant1, user: user1, token: token1 } = await testDb.setupTestTenant());
    ({ tenant: tenant2, user: user2, token: token2 } = await testDb.setupTestTenant());

    client1 = createClient(process.env.VITE_SUPABASE_URL!, token1);
    client2 = createClient(process.env.VITE_SUPABASE_URL!, token2);
  });

  afterEach(async () => {
    await testDb.cleanupTestData(tenant1.id);
    await testDb.cleanupTestData(tenant2.id);
  });

  it('prevents cross-tenant project access', async () => {
    // Create project in tenant1
    const project1 = await testDb.createTestProject(tenant1.id, user1.id);

    // Try to access from tenant2
    const { data, error } = await client2
      .from('projects')
      .select('*')
      .eq('id', project1.id);

    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('allows access within same tenant', async () => {
    // Create project in tenant1
    const project1 = await testDb.createTestProject(tenant1.id, user1.id);

    // Access from same tenant
    const { data, error } = await client1
      .from('projects')
      .select('*')
      .eq('id', project1.id);

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(project1.id);
    expect(error).toBeNull();
  });

  it('isolates user tenant membership', async () => {
    // Check user1 can see their tenant membership
    const { data: membership1 } = await client1
      .from('user_tenant_membership')
      .select('*')
      .eq('user_id', user1.id);

    expect(membership1).toHaveLength(1);
    expect(membership1[0].tenant_id).toBe(tenant1.id);

    // Check user2 cannot see user1's membership
    const { data: membership2 } = await client2
      .from('user_tenant_membership')
      .select('*')
      .eq('user_id', user1.id);

    expect(membership2).toEqual([]);
  });
});
```

### API Integration Testing

#### API Endpoint Testing
```typescript
// tests/integration/api/projects.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '@/server/app';
import { testDb } from '@/tests/helpers/database';

describe('Projects API', () => {
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    const { tenant, user, token } = await testDb.setupTestTenant();
    tenantId = tenant.id;
    userId = user.id;
    authToken = token;
  });

  afterEach(async () => {
    await testDb.cleanupTestData(tenantId);
  });

  describe('GET /api/projects', () => {
    it('returns projects for authenticated user', async () => {
      // Create test project
      await testDb.createTestProject(tenantId, userId);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0].tenant_id).toBe(tenantId);
    });

    it('rejects unauthenticated requests', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });

    it('applies filters correctly', async () => {
      // Create projects with different statuses
      await testDb.createTestProject(tenantId, userId);
      // Add more test projects...

      const response = await request(app)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((p: any) => p.status === 'active')).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('creates project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test Description',
        framework: 'react'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.data).toMatchObject(projectData);
      expect(response.body.data.tenant_id).toBe(tenantId);
      expect(response.body.data.created_by).toBe(userId);
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('name is required');
    });
  });
});
```

### Authentication Integration Testing

#### Auth Flow Testing
```typescript
// tests/integration/auth/authentication.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { testDb } from '@/tests/helpers/database';

describe('Authentication Integration', () => {
  let supabase: SupabaseClient;
  let testEmail: string;
  let testPassword: string;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
    testEmail = `test-${Date.now()}@cin7.com`;
    testPassword = 'testpassword123';
  });

  it('allows user registration with @cin7.com email', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user?.email).toBe(testEmail);
  });

  it('rejects registration with non-cin7.com email', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@gmail.com',
      password: testPassword
    });

    expect(data.user).toBeNull();
    expect(error).toBeTruthy();
  });

  it('allows user sign in with valid credentials', async () => {
    // First register user
    await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    // Then sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    expect(error).toBeNull();
    expect(data.session).toBeTruthy();
    expect(data.user?.email).toBe(testEmail);
  });

  it('rejects sign in with invalid credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'wrongpassword'
    });

    expect(data.session).toBeNull();
    expect(error).toBeTruthy();
  });

  it('maintains session across page reloads', async () => {
    // Sign in
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    // Simulate page reload by creating new client
    const newClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      signInData.session.access_token
    );

    const { data: sessionData } = await newClient.auth.getSession();
    expect(sessionData.session).toBeTruthy();
    expect(sessionData.session?.user.email).toBe(testEmail);
  });
});
```

## End-to-End Testing Strategy

### E2E Test Configuration

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.VITE_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

#### E2E Test Utilities
```typescript
// tests/e2e/helpers/auth.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: any;
  testUser: {
    email: string;
    password: string;
    name: string;
  };
};

export const test = base.extend<AuthFixtures>({
  testUser: [
    async ({}, use) => {
      const testUser = {
        email: `test-${Date.now()}@cin7.com`,
        password: 'testpassword123',
        name: 'Test User'
      };
      await use(testUser);
    },
    { scope: 'test' }
  ],

  authenticatedPage: [
    async ({ page, testUser }, use) => {
      // Sign up user
      await page.goto('/auth/signup');
      await page.fill('[data-testid=email]', testUser.email);
      await page.fill('[data-testid=password]', testUser.password);
      await page.fill('[data-testid=name]', testUser.name);
      await page.click('[data-testid=signup-button]');

      // Verify email (in test environment, we might bypass this)
      await page.goto('/auth/signin');
      await page.fill('[data-testid=email]', testUser.email);
      await page.fill('[data-testid=password]', testUser.password);
      await page.click('[data-testid=signin-button]');

      // Wait for successful sign in
      await page.waitForURL('/dashboard');

      await use(page);
    },
    { scope: 'test' }
  ]
});

export { expect };
```

### User Workflow Testing

#### Project Management Workflow
```typescript
// tests/e2e/projects/project-management.spec.ts
import { test, expect } from '../helpers/auth';

test.describe('Project Management Workflow', () => {
  test('user can create, edit, and delete projects', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects');

    // Create new project
    await authenticatedPage.click('[data-testid=new-project-button]');
    await authenticatedPage.fill('[data-testid=project-name]', 'E2E Test Project');
    await authenticatedPage.fill('[data-testid=project-description]', 'Project created by E2E test');
    await authenticatedPage.selectOption('[data-testid=project-framework]', 'react');
    await authenticatedPage.click('[data-testid=create-project-button]');

    // Verify project created
    await expect(authenticatedPage.locator('[data-testid=project-list]')).toContainText('E2E Test Project');

    // Edit project
    await authenticatedPage.click('[data-testid=edit-project-button]');
    await authenticatedPage.fill('[data-testid=project-name]', 'E2E Test Project - Updated');
    await authenticatedPage.click('[data-testid=save-project-button]');

    // Verify project updated
    await expect(authenticatedPage.locator('[data-testid=project-list]')).toContainText('E2E Test Project - Updated');

    // Delete project
    await authenticatedPage.click('[data-testid=delete-project-button]');
    await authenticatedPage.click('[data-testid=confirm-delete-button]');

    // Verify project deleted
    await expect(authenticatedPage.locator('[data-testid=project-list]')).not.toContainText('E2E Test Project - Updated');
  });

  test('user can search and filter projects', async ({ authenticatedPage }) => {
    // Create multiple test projects
    const projects = [
      { name: 'React Project', framework: 'react' },
      { name: 'Vue Project', framework: 'vue' },
      { name: 'Angular Project', framework: 'angular' }
    ];

    for (const project of projects) {
      await authenticatedPage.goto('/projects');
      await authenticatedPage.click('[data-testid=new-project-button]');
      await authenticatedPage.fill('[data-testid=project-name]', project.name);
      await authenticatedPage.selectOption('[data-testid=project-framework]', project.framework);
      await authenticatedPage.click('[data-testid=create-project-button]');
      await authenticatedPage.waitForURL('/projects');
    }

    // Test search functionality
    await authenticatedPage.goto('/projects');
    await authenticatedPage.fill('[data-testid=search-input]', 'React');
    await expect(authenticatedPage.locator('[data-testid=project-list]')).toContainText('React Project');
    await expect(authenticatedPage.locator('[data-testid=project-list]')).not.toContainText('Vue Project');

    // Test filter functionality
    await authenticatedPage.fill('[data-testid=search-input]', ''); // Clear search
    await authenticatedPage.selectOption('[data-testid=framework-filter]', 'vue');
    await expect(authenticatedPage.locator('[data-testid=project-list]')).toContainText('Vue Project');
    await expect(authenticatedPage.locator('[data-testid=project-list]')).not.toContainText('React Project');
  });
});
```

#### File Management Workflow
```typescript
// tests/e2e/files/file-management.spec.ts
import { test, expect } from '../helpers/auth';

test.describe('File Management Workflow', () => {
  test('user can upload, edit, and delete files', async ({ authenticatedPage }) => {
    // Create test project
    await authenticatedPage.goto('/projects');
    await authenticatedPage.click('[data-testid=new-project-button]');
    await authenticatedPage.fill('[data-testid=project-name]', 'File Management Test');
    await authenticatedPage.click('[data-testid=create-project-button]');

    // Navigate to project
    await authenticatedPage.click('[data-testid=project-link]');

    // Upload file
    await authenticatedPage.click('[data-testid=upload-file-button]');
    const fileInput = authenticatedPage.locator('[data-testid=file-input]');
    await fileInput.setInputFiles({
      name: 'test.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body><h1>Test File</h1></body></html>')
    });
    await authenticatedPage.click('[data-testid=confirm-upload-button]');

    // Verify file uploaded
    await expect(authenticatedPage.locator('[data-testid=file-list]')).toContainText('test.html');

    // Edit file
    await authenticatedPage.click('[data-testid=file-link=test.html]');
    const editor = authenticatedPage.locator('[data-testid=code-editor]');
    await editor.fill('<html><body><h1>Updated Test File</h1></body></html>');
    await authenticatedPage.click('[data-testid=save-file-button]');

    // Verify file saved
    await expect(authenticatedPage.locator('[data-testid=save-status]')).toContainText('Saved');

    // Delete file
    await authenticatedPage.click('[data-testid=delete-file-button]');
    await authenticatedPage.click('[data-testid=confirm-delete-button]');

    // Verify file deleted
    await expect(authenticatedPage.locator('[data-testid=file-list]')).not.toContainText('test.html');
  });

  test('user can preview different file types', async ({ authenticatedPage }) => {
    // Create project and upload different file types
    await authenticatedPage.goto('/projects');
    await authenticatedPage.click('[data-testid=new-project-button]');
    await authenticatedPage.fill('[data-testid=project-name]', 'File Preview Test');
    await authenticatedPage.click('[data-testid=create-project-button]');
    await authenticatedPage.click('[data-testid=project-link]');

    // Upload HTML file
    await authenticatedPage.click('[data-testid=upload-file-button]');
    await authenticatedPage.setInputFiles('[data-testid=file-input]', {
      name: 'index.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body><h1>HTML Content</h1></body></html>')
    });
    await authenticatedPage.click('[data-testid=confirm-upload-button]');

    // Upload CSS file
    await authenticatedPage.click('[data-testid=upload-file-button]');
    await authenticatedPage.setInputFiles('[data-testid=file-input]', {
      name: 'styles.css',
      mimeType: 'text/css',
      buffer: Buffer.from('body { color: red; }')
    });
    await authenticatedPage.click('[data-testid=confirm-upload-button]');

    // Test file preview
    await authenticatedPage.click('[data-testid=preview-file=index.html]');
    await expect(authenticatedPage.locator('[data-testid=preview-content]')).toContainText('HTML Content');

    await authenticatedPage.click('[data-testid=preview-file=styles.css]');
    await expect(authenticatedPage.locator('[data-testid=preview-content]')).toContainText('color: red');
  });
});
```

### Multi-User Collaboration Testing

#### Real-time Collaboration Tests
```typescript
// tests/e2e/collaboration/real-time-editing.spec.ts
import { test, expect } from '../helpers/auth';

test.describe('Real-time Collaboration', () => {
  test('multiple users can edit project simultaneously', async ({ browser }) => {
    // Create authenticated contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Authenticate both users
    await authenticateUser(page1, 'user1@cin7.com');
    await authenticateUser(page2, 'user2@cin7.com');

    // User 1 creates project
    await page1.goto('/projects');
    await page1.click('[data-testid=new-project-button]');
    await page1.fill('[data-testid=project-name]', 'Collaboration Test');
    await page1.click('[data-testid=create-project-button]');
    await page1.click('[data-testid=project-link]');

    // User 1 creates file
    await page1.click('[data-testid=upload-file-button]');
    await page1.setInputFiles('[data-testid=file-input]', {
      name: 'collab.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body><h1>Initial Content</h1></body></html>')
    });
    await page1.click('[data-testid=confirm-upload-button]');
    await page1.click('[data-testid=file-link=collab.html]');

    // User 2 joins project (need invitation workflow)
    await page2.goto('/projects'); // Navigate to shared project
    // ... invitation and acceptance flow

    // Both users edit simultaneously
    await page1.fill('[data-testid=code-editor]', '<html><body><h1>User 1 Edit</h1></body></html>');
    await page2.fill('[data-testid=code-editor]', '<html><body><h1>User 2 Edit</h1></body></html>');

    // Verify real-time updates
    await expect(page1.locator('[data-testid=collaborator-cursor]')).toBeVisible();
    await expect(page2.locator('[data-testid=collaborator-cursor]')).toBeVisible();

    await expect(page1.locator('[data-testid=typing-indicator]')).toContainText('user2@cin7.com is typing');
    await expect(page2.locator('[data-testid=typing-indicator]')).toContainText('user1@cin7.com is typing');

    // Clean up
    await context1.close();
    await context2.close();
  });

  test('presence indicators show active users', async ({ browser }) => {
    // Similar setup for testing presence indicators
    // Test user cursors, selection, and online status
  });
});

async function authenticateUser(page: any, email: string) {
  await page.goto('/auth/signin');
  await page.fill('[data-testid=email]', email);
  await page.fill('[data-testid=password]', 'testpassword123');
  await page.click('[data-testid=signin-button]');
  await page.waitForURL('/dashboard');
}
```

## Performance Testing Strategy

### Load Testing Configuration

#### Artillery Configuration
```yaml
# artillery-config.yml
config:
  target: "{{ $processEnvironment.VITE_API_URL }}"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  processor: "./test-processor.js"

scenarios:
  - name: "Project Management Load Test"
    weight: 70
    flow:
      - get:
          url: "/api/projects"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - think: 1
      - post:
          url: "/api/projects"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "Load Test Project {{ $randomString() }}"
            description: "Created during load test"
            framework: "react"

  - name: "File Management Load Test"
    weight: 30
    flow:
      - get:
          url: "/api/projects/{{ $randomProjectId }}/files"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - post:
          url: "/api/projects/{{ $randomProjectId }}/files"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "load-test-file-{{ $randomString() }}.html"
            content: "<html><body>Load test content</body></html>"
            type: "html"
```

#### Frontend Performance Testing
```typescript
// tests/performance/frontend-performance.test.ts
import { test } from '@playwright/test';

test.describe('Frontend Performance', () => {
  test('page load performance meets requirements', async ({ page }) => {
    // Start performance measurement
    const navigationStart = Date.now();

    await page.goto('/dashboard');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - navigationStart;

    // Assert load time is under 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Check Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              vitals.fcp = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
              vitals.lcp = entry.loadEventEnd - entry.loadEventStart;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['navigation'] });
      });
    });

    expect(vitals.fcp).toBeLessThan(1000); // First Contentful Paint under 1s
    expect(vitals.lcp).toBeLessThan(2500); // Largest Contentful Paint under 2.5s
  });

  test('API response times are acceptable', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure API response times
    const apiResponseTimes = await page.evaluate(async () => {
      const responseTimes = [];

      // Override fetch to measure response times
      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        const start = performance.now();
        const response = await originalFetch(...args);
        const end = performance.now();

        responseTimes.push(end - start);
        return response;
      };

      // Trigger some API calls
      await fetch('/api/projects');
      await fetch('/api/projects/123/files');

      return responseTimes;
    });

    // Assert all API calls are under 100ms
    apiResponseTimes.forEach((time: number) => {
      expect(time).toBeLessThan(100);
    });
  });
});
```

## Security Testing Strategy

### Security Test Suite

#### Authentication Security Tests
```typescript
// tests/security/authentication-security.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('prevents brute force attacks', async ({ page }) => {
    const invalidCredentials = {
      email: 'test@cin7.com',
      password: 'wrongpassword'
    };

    // Attempt multiple failed logins
    for (let i = 0; i < 10; i++) {
      await page.goto('/auth/signin');
      await page.fill('[data-testid=email]', invalidCredentials.email);
      await page.fill('[data-testid=password]', invalidCredentials.password);
      await page.click('[data-testid=signin-button]');

      // Wait for response
      await page.waitForTimeout(1000);
    }

    // After multiple attempts, should show rate limiting message
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', invalidCredentials.email);
    await page.fill('[data-testid=password]', 'correctpassword');
    await page.click('[data-testid=signin-button]');

    // Should show rate limiting error
    await expect(page.locator('[data-testid=rate-limit-error]')).toBeVisible();
  });

  test('session timeout works correctly', async ({ page }) => {
    // Sign in
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'test@cin7.com');
    await page.fill('[data-testid=password]', 'testpassword123');
    await page.click('[data-testid=signin-button]');
    await page.waitForURL('/dashboard');

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();

    // Try to access protected page
    await page.goto('/projects');

    // Should redirect to login
    await page.waitForURL('/auth/signin');
    await expect(page.locator('[data-testid=session-expired-message]')).toBeVisible();
  });

  test('prevents session hijacking', async ({ page, browser }) => {
    // User 1 signs in
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'user1@cin7.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=signin-button]');
    await page.waitForURL('/dashboard');

    // Get session token
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'auth-token');

    // User 2 tries to use the same session token
    const context2 = await browser.newContext();
    await context2.addCookies([sessionCookie]);
    const page2 = await context2.newPage();

    await page2.goto('/dashboard');

    // Should reject the hijacked session
    await page2.waitForURL('/auth/signin');
    await expect(page2.locator('[data-testid=security-error]')).toBeVisible();

    await context2.close();
  });
});
```

#### Data Isolation Security Tests
```typescript
// tests/security/data-isolation.test.ts
import { test, expect } from '../helpers/auth';

test.describe('Data Isolation Security', () => {
  test('prevents unauthorized data access via API', async ({ page }) => {
    // Sign in as user1
    await authenticateUser(page, 'user1@cin7.com');

    // Try to access user2's project directly via API
    const response = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/projects/user2-project-id', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });
        return {
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(response.status).toBe(404);
    expect(response.data.error).toContain('not found');
  });

  test('SQL injection protection', async ({ page }) => {
    // Attempt SQL injection through search
    await page.goto('/projects');
    await page.fill('[data-testid=search-input]', "'; DROP TABLE projects; --");
    await page.click('[data-testid=search-button]');

    // Verify search works normally and no SQL injection occurred
    await expect(page.locator('[data-testid=project-list]')).toBeVisible();

    // Verify projects table still exists by checking normal search
    await page.fill('[data-testid=search-input]', 'test');
    await page.click('[data-testid=search-button]');

    // Should not error out
    await expect(page.locator('[data-testid=project-list]')).toBeVisible();
  });

  test('XSS protection in user inputs', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid=new-project-button]');

    // Attempt XSS attack
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('[data-testid=project-name]', xssPayload);
    await page.fill('[data-testid=project-description]', xssPayload);
    await page.click('[data-testid=create-project-button]');

    // Verify script is not executed
    await expect(page.locator('text=XSS')).not.toBeVisible();

    // Verify content is properly escaped
    const projectName = await page.locator('[data-testid=project-name-display]').textContent();
    expect(projectName).not.toContain('<script>');
  });
});
```

## Quality Gates and CI/CD Integration

### Quality Gate Configuration

#### Pre-commit Quality Checks
```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run unit tests
npm run test:unit

# Check test coverage
npm run test:coverage

# Security audit
npm audit --audit-level high

echo "✅ All quality checks passed"
```

#### Pull Request Quality Gates
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality-checks:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Check test coverage
        run: npm run test:coverage
        # Fail if coverage is below 80%
        run: |
          COVERAGE=$(npm run test:coverage:check | grep -o '[0-9]*\.[0-9]*' | head -1)
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Test coverage $COVERAGE% is below 80%"
            exit 1
          fi

      - name: Security audit
        run: npm audit --audit-level high

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Performance audit
        run: npm run test:performance

      - name: Security scan
        run: |
          npm install -g snyk
          snyk test --severity-threshold=high
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Test Coverage Requirements

#### Coverage Configuration
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
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/stories/**',
        '**/mocks/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Higher thresholds for critical modules
        'src/services/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/utils/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  }
});
```

#### Coverage Reporting
```typescript
// scripts/generate-coverage-report.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface CoverageReport {
  total: {
    lines: { covered: number; total: number };
    functions: { covered: number; total: number };
    branches: { covered: number; total: number };
    statements: { covered: number; total: number };
  };
  modules: Array<{
    path: string;
    lines: { covered: number; total: number; percentage: number };
  }>;
}

function generateCoverageReport(): void {
  // Run coverage collection
  execSync('npm run test:coverage', { stdio: 'inherit' });

  // Read coverage data
  const coverageData = JSON.parse(
    readFileSync('./coverage/coverage-summary.json', 'utf-8')
  );

  // Generate HTML report
  const report = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Coverage Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .coverage-good { color: green; }
        .coverage-warning { color: orange; }
        .coverage-bad { color: red; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Test Coverage Report</h1>
        <p>Total Coverage: ${coverageData.total.lines.pct}%</p>
      </div>

      <table>
        <tr>
          <th>Module</th>
          <th>Lines</th>
          <th>Functions</th>
          <th>Branches</th>
          <th>Statements</th>
        </tr>
        ${Object.entries(coverageData)
          .filter(([key]) => key !== 'total')
          .map(([path, data]: [string, any]) => `
            <tr>
              <td>${path}</td>
              <td class="${getCoverageClass(data.lines.pct)}">${data.lines.pct}%</td>
              <td class="${getCoverageClass(data.functions.pct)}">${data.functions.pct}%</td>
              <td class="${getCoverageClass(data.branches.pct)}">${data.branches.pct}%</td>
              <td class="${getCoverageClass(data.statements.pct)}">${data.statements.pct}%</td>
            </tr>
          `).join('')}
      </table>
    </body>
    </html>
  `;

  writeFileSync('./coverage/report.html', report);
  console.log('Coverage report generated: ./coverage/report.html');
}

function getCoverageClass(percentage: number): string {
  if (percentage >= 80) return 'coverage-good';
  if (percentage >= 60) return 'coverage-warning';
  return 'coverage-bad';
}

generateCoverageReport();
```

## Test Data Management

### Test Fixtures

#### Dynamic Fixture Generation
```typescript
// tests/helpers/fixtures.ts
import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';

export class FixtureFactory {
  static createTenant(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      domain: '@cin7.com',
      settings: {},
      created_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  static createUser(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email().replace(/@.+$/, '@cin7.com'),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement(['admin', 'developer', 'designer', 'viewer']),
      department: faker.commerce.department(),
      preferences: {},
      created_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  static createProject(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      name: faker.commerce.productName(),
      description: faker.lorem.paragraph(),
      framework: faker.helpers.arrayElement(['react', 'vue', 'angular', 'svelte', 'vanilla']),
      status: faker.helpers.arrayElement(['draft', 'active', 'archived']),
      visibility: faker.helpers.arrayElement(['private', 'team', 'public']),
      created_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  static createProjectFile(overrides: Partial<any> = {}) {
    const fileTypes = ['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'json', 'md'];
    const type = faker.helpers.arrayElement(fileTypes);

    return {
      id: faker.datatype.uuid(),
      name: `${faker.system.fileName()}.${type}`,
      type,
      content: faker.lorem.paragraphs(2),
      language: this.getLanguageFromType(type),
      size: faker.datatype.number({ min: 100, max: 10000 }),
      created_at: faker.date.recent().toISOString(),
      ...overrides
    };
  }

  private static getLanguageFromType(type: string): string {
    const languageMap = {
      html: 'html',
      css: 'css',
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      json: 'json',
      md: 'markdown'
    };
    return languageMap[type] || 'text';
  }
}

// Example usage
export const mockTenant = FixtureFactory.createTenant();
export const mockUser = FixtureFactory.createUser();
export const mockProject = FixtureFactory.createProject({ tenant_id: mockTenant.id });
export const mockFile = FixtureFactory.createProjectFile({
  project_id: mockProject.id,
  tenant_id: mockTenant.id
});
```

### Test Database Setup

#### Database Seeding
```typescript
// tests/helpers/seed.ts
import { testDb } from './database';
import { FixtureFactory } from './fixtures';

export class DatabaseSeeder {
  static async seedBasicTestData(): Promise<{
    tenant: any;
    user: any;
    project: any;
    files: any[];
  }> {
    // Create tenant
    const tenant = FixtureFactory.createTenant();
    const { data: createdTenant } = await testDb.supabase
      .from('tenants')
      .insert([tenant])
      .select()
      .single();

    // Create user
    const user = FixtureFactory.createUser({ tenant_id: createdTenant.id });
    const { data: createdUser } = await testDb.supabase.auth.signUp({
      email: user.email,
      password: 'testpassword123',
      options: { data: { tenant_id: createdTenant.id } }
    });

    // Create user-tenant membership
    await testDb.supabase
      .from('user_tenant_membership')
      .insert([{
        user_id: createdUser.user.id,
        tenant_id: createdTenant.id,
        role: 'owner'
      }]);

    // Create project
    const project = FixtureFactory.createProject({
      tenant_id: createdTenant.id,
      created_by: createdUser.user.id
    });
    const { data: createdProject } = await testDb.supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    // Create files
    const files = [];
    for (let i = 0; i < 5; i++) {
      const file = FixtureFactory.createProjectFile({
        project_id: createdProject.id,
        tenant_id: createdTenant.id,
        created_by: createdUser.user.id
      });

      const { data: createdFile } = await testDb.supabase
        .from('project_files')
        .insert([file])
        .select()
        .single();

      files.push(createdFile);
    }

    return {
      tenant: createdTenant,
      user: createdUser.user,
      project: createdProject,
      files
    };
  }

  static async cleanupTestData(tenantId: string): Promise<void> {
    await testDb.cleanupTestData(tenantId);
  }
}
```

## Test Execution and Reporting

### Test Scripts

#### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:performance": "playwright test tests/performance",
    "test:security": "playwright test tests/security",
    "test:coverage": "vitest run --coverage",
    "test:coverage:check": "vitest run --coverage && npm run test:coverage:threshold",
    "test:coverage:threshold": "node scripts/check-coverage-threshold.js",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:ci": "npm run test:unit && npm run test:integration",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui"
  }
}
```

### Test Reporting Dashboard

#### Test Results Aggregation
```typescript
// scripts/generate-test-report.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResults {
  unit: {
    passed: number;
    failed: number;
    total: number;
    coverage: number;
  };
  integration: {
    passed: number;
    failed: number;
    total: number;
  };
  e2e: {
    passed: number;
    failed: number;
    total: number;
  };
  performance: {
    lighthouse: number;
    apiResponseTime: number;
  };
  security: {
    vulnerabilities: number;
    passed: boolean;
  };
}

class TestReportGenerator {
  async generateReport(): Promise<void> {
    const results: TestResults = {
      unit: this.getUnitTestResults(),
      integration: this.getIntegrationTestResults(),
      e2e: this.getE2ETestResults(),
      performance: this.getPerformanceResults(),
      security: this.getSecurityResults()
    };

    const htmlReport = this.generateHTMLReport(results);
    writeFileSync('./test-results/report.html', htmlReport);

    console.log('Test report generated: ./test-results/report.html');
  }

  private getUnitTestResults() {
    // Read unit test results from Vitest JSON output
    if (existsSync('./test-results/unit-results.json')) {
      const data = JSON.parse(readFileSync('./test-results/unit-results.json', 'utf-8'));
      return {
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        total: data.numTotalTests,
        coverage: this.getCoveragePercentage()
      };
    }
    return { passed: 0, failed: 0, total: 0, coverage: 0 };
  }

  private getIntegrationTestResults() {
    // Read integration test results
    if (existsSync('./test-results/integration-results.json')) {
      const data = JSON.parse(readFileSync('./test-results/integration-results.json', 'utf-8'));
      return {
        passed: data.numPassedTests,
        failed: data.numFailedTests,
        total: data.numTotalTests
      };
    }
    return { passed: 0, failed: 0, total: 0 };
  }

  private getE2ETestResults() {
    // Read E2E test results from Playwright
    if (existsSync('./test-results/results.json')) {
      const data = JSON.parse(readFileSync('./test-results/results.json', 'utf-8'));
      return {
        passed: data.suites.reduce((acc: number, suite: any) =>
          acc + suite.specs.reduce((specAcc: number, spec: any) =>
            specAcc + spec.tests.filter((t: any) => t.results[0].status === 'passed').length, 0), 0),
        failed: data.suites.reduce((acc: number, suite: any) =>
          acc + suite.specs.reduce((specAcc: number, spec: any) =>
            specAcc + spec.tests.filter((t: any) => t.results[0].status === 'failed').length, 0), 0),
        total: data.suites.reduce((acc: number, suite: any) =>
          acc + suite.specs.reduce((specAcc: number, spec: any) => specAcc + spec.tests.length, 0), 0)
      };
    }
    return { passed: 0, failed: 0, total: 0 };
  }

  private getPerformanceResults() {
    // Read Lighthouse results
    if (existsSync('./test-results/lighthouse.json')) {
      const data = JSON.parse(readFileSync('./test-results/lighthouse.json', 'utf-8'));
      return {
        lighthouse: data.lhr.categories.performance.score * 100,
        apiResponseTime: data.apiResponseTime || 0
      };
    }
    return { lighthouse: 0, apiResponseTime: 0 };
  }

  private getSecurityResults() {
    // Read security scan results
    if (existsSync('./test-results/security.json')) {
      const data = JSON.parse(readFileSync('./test-results/security.json', 'utf-8'));
      return {
        vulnerabilities: data.vulnerabilities || 0,
        passed: data.passed || false
      };
    }
    return { vulnerabilities: 0, passed: false };
  }

  private getCoveragePercentage(): number {
    if (existsSync('./coverage/coverage-summary.json')) {
      const data = JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf-8'));
      return data.total.lines.pct;
    }
    return 0;
  }

  private generateHTMLReport(results: TestResults): string {
    const overallHealth = this.calculateOverallHealth(results);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CIN7 AI Playground - Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .health-good { color: green; font-weight: bold; }
          .health-warning { color: orange; font-weight: bold; }
          .health-bad { color: red; font-weight: bold; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .progress-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; }
          .progress-fill { height: 100%; border-radius: 10px; transition: width 0.3s ease; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CIN7 AI Playground - Test Report</h1>
          <p>Generated: ${new Date().toISOString()}</p>
          <div class="metric">
            Overall Health: <span class="health-${overallHealth.class}">${overallHealth.score}%</span>
          </div>
        </div>

        <div class="section">
          <h2>Test Results Summary</h2>
          <table>
            <tr>
              <th>Test Type</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Total</th>
              <th>Success Rate</th>
            </tr>
            <tr>
              <td>Unit Tests</td>
              <td>${results.unit.passed}</td>
              <td>${results.unit.failed}</td>
              <td>${results.unit.total}</td>
              <td>${this.calculateSuccessRate(results.unit.passed, results.unit.total)}%</td>
            </tr>
            <tr>
              <td>Integration Tests</td>
              <td>${results.integration.passed}</td>
              <td>${results.integration.failed}</td>
              <td>${results.integration.total}</td>
              <td>${this.calculateSuccessRate(results.integration.passed, results.integration.total)}%</td>
            </tr>
            <tr>
              <td>E2E Tests</td>
              <td>${results.e2e.passed}</td>
              <td>${results.e2e.failed}</td>
              <td>${results.e2e.total}</td>
              <td>${this.calculateSuccessRate(results.e2e.passed, results.e2e.total)}%</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2>Quality Metrics</h2>
          <div class="metric">
            <h3>Code Coverage</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${results.unit.coverage}%; background-color: ${this.getCoverageColor(results.unit.coverage)};">
                ${results.unit.coverage}%
              </div>
            </div>
          </div>
          <div class="metric">
            <h3>Performance (Lighthouse)</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${results.performance.lighthouse}%; background-color: ${this.getPerformanceColor(results.performance.lighthouse)};">
                ${results.performance.lighthouse}%
              </div>
            </div>
          </div>
          <div class="metric">
            <h3>Security</h3>
            <p>Vulnerabilities: ${results.security.vulnerabilities}</p>
            <p>Status: <span class="${results.security.passed ? 'health-good' : 'health-bad'}">${results.security.passed ? 'PASSED' : 'FAILED'}</span></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private calculateOverallHealth(results: TestResults) {
    const scores = [
      this.calculateSuccessRate(results.unit.passed, results.unit.total),
      this.calculateSuccessRate(results.integration.passed, results.integration.total),
      this.calculateSuccessRate(results.e2e.passed, results.e2e.total),
      results.unit.coverage,
      results.performance.lighthouse,
      results.security.passed ? 100 : 0
    ];

    const average = scores.reduce((acc, score) => acc + score, 0) / scores.length;

    return {
      score: Math.round(average),
      class: average >= 90 ? 'good' : average >= 70 ? 'warning' : 'bad'
    };
  }

  private calculateSuccessRate(passed: number, total: number): number {
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  }

  private getCoverageColor(coverage: number): string {
    if (coverage >= 80) return '#4CAF50';
    if (coverage >= 60) return '#FF9800';
    return '#F44336';
  }

  private getPerformanceColor(score: number): string {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FF9800';
    return '#F44336';
  }
}

// Generate report
const generator = new TestReportGenerator();
generator.generateReport().catch(console.error);
```

---

This comprehensive testing strategy ensures the quality, security, and performance of the CIN7 AI Playground throughout the development lifecycle. The multi-layered approach with automated quality gates helps maintain high standards while enabling rapid development cycles.

The next step is to create the GitHub project structure for task management and sprint tracking to support this testing strategy.