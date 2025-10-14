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
  Stack,
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
  CodeMajor,
  MobileMajor,
  DesktopMajor,
  AnalyticsMajor,
  CirclePlusMajor,
  ExportMinor,
  ImportMinor
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
    <Card
      background={project.featured ? 'bg-surface-subdued' : 'bg-surface'}
      sectioned
      actions={actions.length > 0 ? actions : undefined}
    >
      <div style={{ height: '100%' }}>
        <Stack vertical spacing="tight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="headingSm" as="h3">
              {project.name}
            </Text>
            {project.featured && (
              <Badge status="attention">Featured</Badge>
            )}
          </div>

          <Text variant="bodySm" as="p" color="subdued">
            {project.description || 'No description'}
          </Text>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <Text variant="bodyXs" as="p" color="subdued">
              {project.files_count || 0} files
            </Text>
            <Text variant="bodyXs" as="p" color="subdued">
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
        </Stack>
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
    <Card
      background={template.featured ? 'bg-surface-subdued' : 'bg-surface'}
      sectioned
      actions={[
        {
          content: 'Use Template',
          onAction: () => onSelect(template.prompt),
          disabled
        }
      ]}
    >
      <div style={{ textAlign: 'center', height: '100%' }}>
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
          <Card sectioned>
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
        <Card key={index} sectioned>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <Icon source={feature.icon} size="large" color="base" />
            </div>
            <Text variant="headingMd" as="h3" alignment="center">
              {feature.title}
            </Text>
            <Text variant="bodySm" as="p" color="subdued" alignment="center">
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
        <Card key={index} sectioned>
          <Stack vertical spacing="tight">
            <Text variant="bodySm" color="subdued">
              {stat.label}
            </Text>
            <Stack alignment="baseline" spacing="tight">
              <Text variant="headingLg" as="h2">
                {stat.value}
              </Text>
              {stat.badge && <Badge>{stat.badge}</Badge>}
            </Stack>
            {stat.trend && (
              <Text variant="bodySm" color={stat.trend.direction === 'up' ? 'success' : stat.trend.direction === 'down' ? 'critical' : 'subdued'}>
                {stat.trend.value}
              </Text>
            )}
          </Stack>
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