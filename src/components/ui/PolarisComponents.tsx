import React from 'react'
import {
  Button,
  Card,
  FormLayout,
  Layout,
  Page,
  Text,
  Badge,
  Icon,
  SkeletonDisplayText,
  SkeletonBodyText,
  Scrollable,
  Modal,
  TextContainer,
  EmptyState,
  Tabs,
  Grid,
  Divider
} from '@shopify/polaris'
import {
  CodeIcon,
  MobileIcon,
  DesktopIcon,
  ChartBarIcon,
  PlusCircleIcon,
  ExportIcon,
  ImportIcon
} from '@shopify/polaris-icons'

// Reusable Components for consistent Polaris usage throughout the app

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string
    files_count?: number
    updated_at: string
    featured?: boolean
  }
  onOpen: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  disabled?: boolean
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onEdit,
  onDelete,
  disabled = false
}) => {
  const actions = []

  if (onEdit) {
    actions.push({
      content: 'Edit',
      onAction: () => onEdit(project.id)
    })
  }

  if (onDelete) {
    actions.push({
      content: 'Delete',
      destructive: true,
      onAction: () => onDelete(project.id)
    })
  }

  return (
    <Card>
      <div style={{ height: '100%', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="headingSm" as="h3">
              {project.name}
            </Text>
            {project.featured && (
              <Badge tone="attention">Featured</Badge>
            )}
          </div>

          <Text variant="bodySm" as="p">
            {project.description || 'No description'}
          </Text>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <Text variant="bodyXs" as="p">
              {project.files_count || 0} files
            </Text>
            <Text variant="bodyXs" as="p">
              Updated {new Date(project.updated_at).toLocaleDateString()}
            </Text>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Button
              size="slim"
              fullWidth
              onClick={() => onOpen(project.id)}
              disabled={disabled}
            >
              Open Project
            </Button>
          </div>

          {actions.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="slim"
                  onClick={action.onAction}
                  tone={action.destructive ? 'critical' : 'base'}
                >
                  {action.content}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

interface TemplateCardProps {
  template: {
    title: string
    description: string
    icon: any
    category: string
    featured?: boolean
    prompt: string
  }
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  disabled = false
}) => {
  return (
    <Card>
      <div style={{ textAlign: 'center', height: '100%', padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Icon
            source={template.icon}
          />
        </div>

        <Text variant="headingMd" as="h3" alignment="center">
          {template.title}
        </Text>

        <div style={{ margin: '0.5rem 0' }}>
          <Badge>{template.category}</Badge>
          {template.featured && (
            <Badge tone="attention" style={{ marginLeft: '0.5rem' }}>
              Featured
            </Badge>
          )}
        </div>

        <Text variant="bodySm" as="p" alignment="center">
          {template.description}
        </Text>

        <div style={{ marginTop: '1rem' }}>
          <Button
            onClick={() => onSelect(template.prompt)}
            disabled={disabled}
            fullWidth
          >
            Use Template
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface LoadingStateProps {
  title?: string
  description?: string
  showSkeleton?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading...',
  description = 'Please wait while we load your content',
  showSkeleton = true
}) => {
  return (
    <Page title={title}>
      <Layout>
        <Layout.Section>
          <Card>
            <TextContainer>
              <SkeletonDisplayText size="small" />
              {showSkeleton && <SkeletonBodyText lines={3} />}
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}

interface EmptyStateProps {
  heading: string
  action?: {
    content: string
    onAction: () => void
  }
  secondaryAction?: {
    content: string
    onAction: () => void
  }
  image?: string
  children?: React.ReactNode
}

export const CustomEmptyState: React.FC<EmptyStateProps> = ({
  heading,
  action,
  secondaryAction,
  image,
  children
}) => {
  return (
    <EmptyState
      heading={heading}
      action={action}
      secondaryAction={secondaryAction}
      image={image}
      fullWidth
    >
      {children}
    </EmptyState>
  )
}

interface FeatureGridProps {
  features: Array<{
    icon: any
    title: string
    description: string
  }>
  columns?: number
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  features,
  columns = 3
}) => {
  return (
    <Grid columns={{ xs: 1, sm: 2, md: 3, lg: columns, xl: columns }}>
      {features.map((feature, index) => (
        <Card key={index}>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <Icon source={feature.icon} />
            </div>
            <Text variant="headingMd" as="h3" alignment="center">
              {feature.title}
            </Text>
            <Text variant="bodySm" as="p" alignment="center">
              {feature.description}
            </Text>
          </div>
        </Card>
      ))}
    </Grid>
  )
}

interface StatsGridProps {
  stats: Array<{
    label: string
    value: string | number
    badge?: string
    trend?: {
      value: string
      direction: 'up' | 'down' | 'neutral'
    }
  }>
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text variant="bodySm" as="span">
              {stat.label}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Text variant="headingLg" as="h2">
                {stat.value}
              </Text>
              {stat.badge && <Badge>{stat.badge}</Badge>}
            </div>
            {stat.trend && (
              <Text variant="bodySm" as="span">
                {stat.trend.value}
              </Text>
            )}
          </div>
        </Card>
      ))}
    </Grid>
  )
}

interface TabPanelProps {
  tabs: Array<{
    id: string
    content: React.ReactNode
    panelID: string
  }>
  selected: number
  onSelect: (index: number) => void
}

export const TabPanel: React.FC<TabPanelProps> = ({ tabs, selected, onSelect }) => {
  return (
    <Tabs tabs={tabs} selected={selected} onSelect={onSelect}>
      {tabs[selected].content}
    </Tabs>
  )
}

interface ActionModalProps {
  open: boolean
  onClose: () => void
  title: string
  primaryAction: {
    content: string
    onAction: () => void
    loading?: boolean
    disabled?: boolean
  }
  secondaryActions?: Array<{
    content: string
    onAction: () => void
  }>
  children: React.ReactNode
}

export const ActionModal: React.FC<ActionModalProps> = ({
  open,
  onClose,
  title,
  primaryAction,
  secondaryActions,
  children
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
    >
      <Modal.Section>
        {children}
      </Modal.Section>
    </Modal>
  )
}

// Constants for consistent styling and configurations
export const POLARIS_CONFIG = {
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  },
  SIZES: {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large'
  },
  VARIANTS: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    DESTRUCTIVE: 'destructive',
    PLAIN: 'plain'
  }
}

// Utility functions for consistent Polaris usage
export const polarisUtils = {
  getStatusColor: (status: 'success' | 'warning' | 'critical' | 'info' | 'new') => {
    const colors = {
      success: 'success',
      warning: 'attention',
      critical: 'critical',
      info: 'info',
      new: 'new'
    }
    return colors[status] || 'info'
  },

  formatFileSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  formatDate: (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  truncateText: (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
}