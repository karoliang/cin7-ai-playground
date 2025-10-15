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
  Badge,
  Icon,
  Banner
} from '@shopify/polaris'
// Simple fallback icons - using emoji or text
const MobileMajor = "📱"
const DesktopMajor = "🖥️"
const StoreMajor = "🏪"
const AnalyticsMajor = "📊"
const ChatMajor = "💬"
const CodeMajor = "💻"
const CircleCheckMajor = "✅"
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { TemplateCard, StatsGrid, FeatureGrid, CustomEmptyState } from '@/components/ui/PolarisComponents'

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
              <Text variant="bodyLg" as="p">
                Build professional multi-page applications with AI-powered code generation,
                CIN7 design system, and modern development practices.
              </Text>
              {user && (
                <div style={{ marginTop: '1rem' }}>
                  <Badge tone="success">{`Signed in as ${user.email}`}</Badge>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Create Project Form */}
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Text variant="headingMd" as="h3">Create New Project</Text>
              <form onSubmit={handleCreateProject} style={{ marginTop: '1rem' }}>
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
                      <Text as="span" tone="critical">
                        Please sign in to create projects
                      </Text>
                    )}
                  </div>
                </FormLayout>
              </form>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Features Overview */}
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Text variant="headingMd" as="h3">AI-Powered Development Features</Text>
              <div style={{ marginTop: '1rem' }}>
                <FeatureGrid
                  features={[
                    {
                      icon: CodeMajor,
                      title: 'Multi-Page Generation',
                      description: 'Generate complete multi-page applications with routing and navigation'
                    },
                    {
                      icon: AnalyticsMajor,
                      title: 'Smart Architecture',
                      description: 'AI detects optimal structure and generates production-ready code'
                    },
                    {
                      icon: StoreMajor,
                      title: 'CIN7 Integration',
                      description: 'Built-in CIN7 design system and Polaris components'
                    },
                    {
                      icon: ChatMajor,
                      title: 'Contextual Updates',
                      description: 'Chat with AI to modify and improve your projects iteratively'
                    },
                    {
                      icon: DesktopMajor,
                      title: 'Real-time Preview',
                      description: 'See your changes instantly with live preview functionality'
                    },
                    {
                      icon: MobileMajor,
                      title: 'Mobile-First',
                      description: 'Responsive designs that work perfectly on all devices'
                    }
                  ]}
                  columns={3}
                />
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Template Gallery */}
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Text variant="headingMd" as="h3">Start with a Template</Text>
              <div style={{ marginTop: '1rem' }}>
                <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}>
                  {templates.map((template, index) => (
                    <div key={index} style={{ height: '100%', padding: '0.5rem' }}>
                      <TemplateCard
                        template={template}
                        onSelect={handleTemplateClick}
                        disabled={!isAuthenticated || isLoading}
                      />
                    </div>
                  ))}
                </Grid>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {recentProjects.length > 0 && (
          <Layout.Section>
            {/* Recent Projects */}
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text variant="headingMd" as="h3">Recent Projects</Text>
                <div style={{ marginTop: '1rem' }}>
                  <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
                    {recentProjects.map((project: any, index) => (
                      <div key={index} style={{ height: '100%', padding: '0.5rem' }}>
                        <Card>
                          <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <Text variant="headingSm" as="h3">
                                {project.name}
                              </Text>
                              <Button
                                size="slim"
                                onClick={() => navigate(`/project/${project.id}`)}
                              >
                                Open
                              </Button>
                            </div>
                            <Text variant="bodySm" as="p">
                              {project.description || 'No description'}
                            </Text>
                            <div style={{ marginTop: '0.5rem' }}>
                              <Text variant="bodyXs" as="p">
                                Updated {new Date(project.updated_at).toLocaleDateString()}
                              </Text>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </Grid>
                </div>
              </div>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  )
}

export default HomePage