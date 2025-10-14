import React, { useState } from 'react'
import {
  Card,
  FormLayout,
  TextField,
  Button,
  Layout,
  Page,
  Text,
  Grid,
  Thumbnail,
  Badge,
  Icon
} from '@shopify/polaris'
import {
  MobileMajor,
  DesktopMajor,
  StoreMajor,
  AnalyticsMajor,
  ChatMajor,
  CodeMajor
} from '@shopify/polaris-icons'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { createProject } = useProjectStore()
  const { user, isAuthenticated } = useAuthStore()
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    try {
      setIsLoading(true)
      const projectId = await createProject(prompt.trim())
      navigate(`/project/${projectId}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateClick = async (templatePrompt: string) => {
    try {
      setIsLoading(true)
      const projectId = await createProject(templatePrompt)
      navigate(`/project/${projectId}`)
    } catch (error) {
      console.error('Failed to create project from template:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const templates = [
    {
      title: 'CIN7 Sales Dashboard',
      description: 'Complete sales analytics dashboard with charts and KPIs',
      prompt: 'Create a CIN7 sales dashboard with revenue charts, order statistics, customer analytics, and inventory insights using Polaris design system',
      icon: AnalyticsMajor,
      category: 'CIN7',
      featured: true
    },
    {
      title: 'Inventory Management',
      description: 'Real-time inventory tracking and management system',
      prompt: 'Build an inventory management interface with product listings, stock levels, reorder alerts, and supplier information using CIN7 design patterns',
      icon: StoreMajor,
      category: 'CIN7',
      featured: true
    },
    {
      title: 'Multi-page Dashboard',
      description: 'Professional dashboard with multiple pages and navigation',
      prompt: 'Create a multi-page dashboard application with sidebar navigation, overview page, analytics, user management, and settings pages',
      icon: DesktopMajor,
      category: 'Dashboard',
      featured: false
    },
    {
      title: 'Mobile E-commerce',
      description: 'Responsive e-commerce site optimized for mobile',
      prompt: 'Build a mobile-first e-commerce website with product catalog, shopping cart, checkout process, and user account management',
      icon: MobileMajor,
      category: 'E-commerce',
      featured: false
    },
    {
      title: 'AI Chat Interface',
      description: 'Modern chat interface with message history',
      prompt: 'Create a modern chat application with message threading, typing indicators, emoji support, and message search functionality',
      icon: ChatMajor,
      category: 'Communication',
      featured: false
    },
    {
      title: 'Code Editor',
      description: 'Online code editor with syntax highlighting',
      prompt: 'Build a web-based code editor with syntax highlighting, multiple language support, file management, and live preview',
      icon: CodeMajor,
      category: 'Development',
      featured: false
    }
  ]

  const recentProjects = [] // This would come from a store or API

  return (
    <Page
      title="CIN7 AI Playground"
      subtitle="Transform your ideas into fully functional multi-page applications with AI"
      primaryAction={{
        content: 'View Documentation',
        onAction: () => window.open('https://docs.cin7.com', '_blank')
      }}
    >
      <Layout>
        <Layout.Section>
          {/* Welcome Card */}
          <Card>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '1rem' }}>
                <img
                  src="/cin7-logo-full.svg"
                  alt="CIN7"
                  style={{ height: '40px', maxWidth: '100%' }}
                />
              </div>
              <Text variant="headingLg" as="h2">
                Welcome to CIN7 AI Playground
              </Text>
              <Text variant="bodyLg" as="p" color="subdued">
                Build professional multi-page applications with AI-powered code generation,
                CIN7 design system, and modern development practices.
              </Text>
              {user && (
                <div style={{ marginTop: '1rem' }}>
                  <Badge status="success">Signed in as {user.email}</Badge>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Create Project Form */}
          <Card title="Create New Project" sectioned>
            <form onSubmit={handleCreateProject}>
              <FormLayout>
                <TextField
                  label="Describe your project"
                  placeholder="e.g., Create a CIN7 sales dashboard with revenue charts and order analytics..."
                  value={prompt}
                  onChange={setPrompt}
                  multiline={3}
                  autoComplete="off"
                  disabled={!isAuthenticated || isLoading}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Button
                    variant="primary"
                    size="large"
                    submit
                    disabled={!prompt.trim() || !isAuthenticated || isLoading}
                    loading={isLoading}
                  >
                    Create Project
                  </Button>
                  {!isAuthenticated && (
                    <Text color="critical">
                      Please sign in to create projects
                    </Text>
                  )}
                </div>
              </FormLayout>
            </form>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Template Gallery */}
          <Card title="Start with a Template" sectioned>
            <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }} gap="4">
              {templates.map((template, index) => (
                <div key={index} style={{ height: '100%' }}>
                  <Card
                    background={template.featured ? 'bg-surface-subdued' : 'bg-surface'}
                    sectioned
                    actions={[
                      {
                        content: 'Use Template',
                        onAction: () => handleTemplateClick(template.prompt),
                        disabled: !isAuthenticated || isLoading
                      }
                    ]}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <Icon
                          source={template.icon}
                          size="large"
                          color="base"
                        />
                      </div>
                      <Text variant="headingMd" as="h3" alignment="center">
                        {template.title}
                      </Text>
                      <div style={{ margin: '0.5rem 0' }}>
                        <Badge>{template.category}</Badge>
                        {template.featured && (
                          <Badge status="attention" style={{ marginLeft: '0.5rem' }}>
                            Featured
                          </Badge>
                        )}
                      </div>
                      <Text variant="bodySm" as="p" color="subdued" alignment="center">
                        {template.description}
                      </Text>
                    </div>
                  </Card>
                </div>
              ))}
            </Grid>
          </Card>
        </Layout.Section>

        {recentProjects.length > 0 && (
          <Layout.Section>
            {/* Recent Projects */}
            <Card title="Recent Projects" sectioned>
              <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="4">
                {recentProjects.map((project: any, index) => (
                  <div key={index} style={{ height: '100%' }}>
                    <Card
                      sectioned
                      actions={[
                        {
                          content: 'Open',
                          onAction: () => navigate(`/project/${project.id}`)
                        }
                      ]}
                    >
                      <Text variant="headingSm" as="h3">
                        {project.name}
                      </Text>
                      <Text variant="bodySm" as="p" color="subdued">
                        {project.description || 'No description'}
                      </Text>
                      <div style={{ marginTop: '0.5rem' }}>
                        <Text variant="bodyXs" as="p" color="subdued">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </Card>
                  </div>
                ))}
              </Grid>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  )
}