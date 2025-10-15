import React, { useState } from 'react'
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  ButtonGroup,
  Text,
  Badge,
  Tabs,
  Banner,
  BlockStack,
  InlineStack,
  Divider,
  ChoiceList,
  RangeSlider,
  Modal,
  TextContainer
} from '@shopify/polaris'
import {
  SettingsIcon,
  ExportIcon,
  ImportIcon,
  DeleteIcon,
  PlusCircleIcon,
  RefreshIcon
} from '@shopify/polaris-icons'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/ui/ThemeProvider'
import { ActionModal } from '@/components/ui/PolarisComponents'

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, isAuthenticated, deleteAccount, isLoading: authIsLoading, error: authError } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const [selectedTab, setSelectedTab] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteProgress, setDeleteProgress] = useState(0)
  const [deleteStatus, setDeleteStatus] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [canDelete, setCanDelete] = useState(false)

  // Profile settings
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profileCompany, setProfileCompany] = useState('')

  // Project settings
  const [defaultTemplate, setDefaultTemplate] = useState('dashboard')
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(30)

  // Export settings
  const [exportFormat, setExportFormat] = useState('json')
  const [includeDependencies, setIncludeDependencies] = useState(true)
  const [includeFullContent, setIncludeFullContent] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')

  const tabs = [
    {
      id: 'profile',
      content: 'Profile',
      panelID: 'profile-panel'
    },
    {
      id: 'projects',
      content: 'Projects',
      panelID: 'projects-panel'
    },
    {
      id: 'export',
      content: 'Export',
      panelID: 'export-panel'
    },
    {
      id: 'advanced',
      content: 'Advanced',
      panelID: 'advanced-panel'
    }
  ]

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      await updateProfile({
        name: profileName,
        email: profileEmail,
        company: profileCompany
      })
      console.log('Profile saved successfully')
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    setIsLoading(true)
    setExportProgress(0)
    setExportStatus('Initializing export...')

    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      setExportStatus('Fetching your projects...')
      setExportProgress(10)

      // Get all user projects
      const { getUserProjects } = await import('@/services/projectService')
      const userProjects = await getUserProjects(user.id)

      if (userProjects.length === 0) {
        setExportStatus('No projects found to export')
        setTimeout(() => {
          setShowExportModal(false)
          setExportProgress(0)
          setExportStatus('')
        }, 2000)
        return
      }

      setExportStatus(`Processing ${userProjects.length} projects...`)
      setExportProgress(30)

      let blob: Blob
      let filename: string
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const userName = user.name || user.email || 'user'

      if (exportFormat === 'json') {
        setExportStatus('Creating JSON export...')
        setExportProgress(50)

        // Prepare comprehensive export data
        const exportData = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          projects: userProjects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            prompt: project.prompt,
            status: project.status,
            created_at: project.created_at,
            updated_at: project.updated_at,
            file_count: project.files.length,
            message_count: project.messages.length,
            files: project.files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.type,
              language: file.language,
              size: file.content.length,
              content: includeFullContent ? file.content : undefined,
              created_at: file.created_at,
              updated_at: file.updated_at
            })),
            messages: project.messages.map(message => ({
              id: message.id,
              role: message.role,
              content: includeFullContent ? message.content : message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
              timestamp: message.timestamp
            })),
            settings: project.settings,
            metadata: project.metadata
          })),
          export_metadata: {
            export_date: new Date().toISOString(),
            total_projects: userProjects.length,
            total_files: userProjects.reduce((acc, project) => acc + project.files.length, 0),
            total_messages: userProjects.reduce((acc, project) => acc + project.messages.length, 0),
            export_format: 'json',
            version: '1.0',
            include_full_content: includeFullContent
          }
        }

        filename = `cin7-ai-playground-export-${userName}-${timestamp}.json`
        blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        })

      } else if (exportFormat === 'csv') {
        setExportStatus('Creating CSV summary...')
        setExportProgress(50)

        // Create CSV data for projects summary
        const csvHeaders = [
          'Project ID',
          'Project Name',
          'Description',
          'Status',
          'File Count',
          'Message Count',
          'Created At',
          'Updated At',
          'Primary Framework',
          'Architecture Type'
        ]

        const csvRows = userProjects.map(project => {
          const hasReact = project.files.some(f => f.name.includes('.jsx') || f.name.includes('.tsx'))
          const hasVue = project.files.some(f => f.name.includes('.vue'))
          const framework = hasReact ? 'React' : hasVue ? 'Vue' : 'Vanilla JS'

          return [
            project.id,
            `"${project.name.replace(/"/g, '""')}"`,
            `"${(project.description || '').replace(/"/g, '""')}"`,
            project.status,
            project.files.length,
            project.messages.length,
            project.created_at,
            project.updated_at,
            framework,
            project.metadata.architecture?.type || 'unknown'
          ].join(',')
        })

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')
        filename = `cin7-ai-playground-projects-summary-${userName}-${timestamp}.csv`
        blob = new Blob([csvContent], { type: 'text/csv' })

      } else {
        // Use existing export service for other formats
        setExportStatus('Preparing export package...')
        setExportProgress(50)

        const { exportService } = await import('@/services/exportService')
        const options = exportService.validateExportOptions({
          format: exportFormat as 'zip' | 'github' | 'docker',
          includeDependencies,
          includeReadme: true,
          includeBuildScripts: true,
          minifyCode: false
        })

        // Export all projects (for now, we'll export the first project as an example)
        // In a real implementation, you might want to create a package with multiple projects
        const result = await exportService.exportProject(userProjects[0], options)

        if (!result.success || !result.blob) {
          throw new Error(result.error || 'Export failed')
        }

        blob = result.blob
        filename = result.filename || `cin7-ai-playground-export-${userName}-${timestamp}.zip`
      }

      setExportStatus('Downloading file...')
      setExportProgress(80)

      // Create and download the export file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportProgress(100)
      setExportStatus(`Successfully exported ${userProjects.length} projects to ${filename}`)

      // Keep the success message visible for a moment
      setTimeout(() => {
        setShowExportModal(false)
        setExportProgress(0)
        setExportStatus('')
      }, 3000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

      // Keep the error message visible for a moment
      setTimeout(() => {
        setExportProgress(0)
        setExportStatus('')
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showPasswordInput) {
      // First step: show password input
      setShowPasswordInput(true)
      return
    }

    // Validate inputs
    if (!deletePassword) {
      setDeleteStatus('Please enter your password to confirm deletion')
      return
    }

    if (deleteConfirmation !== 'DELETE') {
      setDeleteStatus('Please type "DELETE" to confirm you understand this action cannot be undone')
      return
    }

    // Start countdown if not already started
    if (countdown === 0 && !canDelete) {
      setCountdown(10)
      setDeleteStatus('Account deletion will begin in 10 seconds. You can cancel by closing this dialog.')

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setCanDelete(true)
            setDeleteStatus('Starting account deletion now...')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return
    }

    setIsLoading(true)
    setDeleteProgress(0)
    setDeleteStatus('Initializing account deletion...')

    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Step 1: Verify password and start deletion process
      setDeleteStatus('Verifying your identity...')
      setDeleteProgress(10)

      // Step 2: Get user projects for deletion summary
      setDeleteStatus('Retrieving your projects...')
      setDeleteProgress(20)

      const { getAccountDeletionSummary } = await import('@/services/accountDeletionService')
      const summary = await getAccountDeletionSummary(user.id)

      const { totalProjects, totalFiles, totalMessages, projectNames } = summary

      // Provide feedback about what will be deleted
      if (totalProjects === 0) {
        setDeleteStatus('No projects found. Proceeding with account deletion...')
      } else {
        setDeleteStatus(`Found ${totalProjects} project${totalProjects === 1 ? '' : 's'} to delete...`)
      }
      setDeleteProgress(25)

      // Step 3: Start deletion process
      setDeleteStatus(`Deleting ${totalProjects} projects, ${totalFiles} files, and ${totalMessages} messages...`)
      setDeleteProgress(30)

      // Step 4: Delete account (this will also delete all projects)
      await deleteAccount(deletePassword)

      setDeleteProgress(100)
      setDeleteStatus('Account deletion completed successfully')

      // Keep success message visible for a moment
      setTimeout(() => {
        setShowDeleteModal(false)
        resetDeleteModalState()

        // Redirect to home or login page after successful deletion
        window.location.href = '/'
      }, 3000)

    } catch (error) {
      console.error('Account deletion failed:', error)

      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid password')) {
          errorMessage = 'Invalid password. Please check your password and try again.'
        } else if (error.message.includes('No authenticated user')) {
          errorMessage = 'Your session has expired. Please sign in again.'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.'
        } else if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please contact support for assistance.'
        } else {
          errorMessage = error.message
        }
      }

      setDeleteStatus(`Deletion failed: ${errorMessage}`)

      // Keep error message visible for longer
      setTimeout(() => {
        setDeleteProgress(0)
        setDeleteStatus('')
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const resetDeleteModalState = () => {
    setDeletePassword('')
    setDeleteConfirmation('')
    setDeleteProgress(0)
    setDeleteStatus('')
    setShowPasswordInput(false)
    setCountdown(0)
    setCanDelete(false)
  }

  const handleCloseDeleteModal = () => {
    if (!isLoading) {
      setShowDeleteModal(false)
      resetDeleteModalState()
    }
  }

  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Auto', value: 'auto' }
  ]

  const templateOptions = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'E-commerce', value: 'ecommerce' },
    { label: 'Portfolio', value: 'portfolio' },
    { label: 'Custom', value: 'custom' }
  ]

  const exportFormatOptions = [
    { label: 'JSON (Full Data)', value: 'json' },
    { label: 'CSV (Summary)', value: 'csv' },
    { label: 'ZIP Archive', value: 'zip' }
  ]

  return (
    <Page
      title="Settings"
      primaryAction={{
        content: 'Save Changes',
        onAction: handleSaveProfile,
        loading: isLoading,
        disabled: !isAuthenticated
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} fitted />
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Quick Actions</Text>
              <BlockStack gap="200">
                <Button icon={ExportIcon} fullWidth onClick={() => setShowExportModal(true)}>
                  Export All Projects
                </Button>
                <Button icon={ImportIcon} fullWidth>
                  Import Projects
                </Button>
                <Button icon={RefreshIcon} fullWidth>
                  Clear Cache
                </Button>
                <Divider />
                <Button icon={DeleteIcon} fullWidth variant="critical" onClick={() => setShowDeleteModal(true)}>
                  Delete Account
                </Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {selectedTab === 0 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Profile Settings</Text>
                <FormLayout>
                  <TextField
                    label="Full Name"
                    value={profileName}
                    onChange={setProfileName}
                    placeholder="Enter your full name"
                    disabled={!isAuthenticated}
                    autoComplete="name"
                  />
                  <TextField
                    label="Email Address"
                    value={profileEmail}
                    onChange={setProfileEmail}
                    placeholder="your.email@example.com"
                    type="email"
                    disabled={!isAuthenticated}
                    autoComplete="email"
                  />
                  <TextField
                    label="Company"
                    value={profileCompany}
                    onChange={setProfileCompany}
                    placeholder="Your company name"
                    disabled={!isAuthenticated}
                    autoComplete="organization"
                  />
                  <Select
                    label="Theme Preference"
                    options={themeOptions}
                    value={resolvedTheme}
                    onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                  />
                  <Divider />
                  <Text variant="headingMd" as="h3">Account Status</Text>
                  <InlineStack gap="200">
                    <Badge tone="success">Active</Badge>
                    <Text variant="bodySm" as="span">
                      Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </Text>
                  </InlineStack>
                </FormLayout>
              </BlockStack>
            </Card>
          )}

          {selectedTab === 1 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Project Settings</Text>
                <FormLayout>
                  <Select
                    label="Default Template"
                    options={templateOptions}
                    value={defaultTemplate}
                    onChange={setDefaultTemplate}
                    disabled={!isAuthenticated}
                  />
                  <Checkbox
                    label="Enable auto-save"
                    checked={autoSave}
                    onChange={setAutoSave}
                    disabled={!isAuthenticated}
                  />
                  {autoSave && (
                    <RangeSlider
                      label="Auto-save interval (seconds)"
                      value={autoSaveInterval}
                      min={10}
                      max={300}
                      step={10}
                      onChange={(value) => setAutoSaveInterval(Array.isArray(value) ? value[0] : value)}
                      output
                      disabled={!isAuthenticated}
                    />
                  )}
                  <ChoiceList
                    title="Default project permissions"
                    choices={[
                      { label: 'Private (only you can view)', value: 'private' },
                      { label: 'Team (team members can view)', value: 'team' },
                      { label: 'Public (anyone can view)', value: 'public' }
                    ]}
                    selected={['private']}
                    onChange={() => {}}
                    disabled={!isAuthenticated}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          )}

          {selectedTab === 2 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Export Settings</Text>
                <FormLayout>
                <Select
                  label="Default export format"
                  options={exportFormatOptions}
                  value={exportFormat}
                  onChange={setExportFormat}
                  disabled={!isAuthenticated}
                />

                {exportFormat === 'json' && (
                  <Checkbox
                    label="Include full file content by default"
                    checked={includeFullContent}
                    onChange={setIncludeFullContent}
                    disabled={!isAuthenticated}
                  />
                )}

                {(exportFormat === 'zip' || exportFormat === 'docker') && (
                  <Checkbox
                    label="Include package.json and dependencies"
                    checked={includeDependencies}
                    onChange={setIncludeDependencies}
                    disabled={!isAuthenticated}
                  />
                )}

                <Checkbox
                  label="Include README documentation"
                  checked={true}
                  onChange={() => {}}
                  disabled={!isAuthenticated}
                />

                <Checkbox
                  label="Minify code before export"
                  checked={false}
                  onChange={() => {}}
                  disabled={!isAuthenticated}
                />

                <Banner tone="info">
                  <Text variant="bodySm" as="p">
                    <strong>Export Formats:</strong><br/>
                    • <strong>JSON:</strong> Complete project data with all files, messages, and settings<br/>
                    • <strong>CSV:</strong> Project summary with statistics for analysis<br/>
                    • <strong>ZIP:</strong> Ready-to-use project files with dependencies<br/>
                    • <strong>Docker:</strong> Containerized project with Docker configuration<br/>
                    • <strong>GitHub:</strong> Repository-ready export with version control
                  </Text>
                </Banner>

                <Banner tone="warning">
                  <Text variant="bodySm" as="p">
                    Export settings are saved per project. You can override these settings when exporting individual projects.
                  </Text>
                </Banner>
                </FormLayout>
              </BlockStack>
            </Card>
          )}

          {selectedTab === 3 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Advanced Settings</Text>
                <FormLayout>
                <Banner tone="warning" title="Advanced Features">
                  <Text variant="bodySm" as="p">
                    These settings are intended for advanced users. Changing these values may affect the performance of the application.
                  </Text>
                </Banner>

                <ChoiceList
                  title="API Endpoint"
                  choices={[
                    { label: 'Production (recommended)', value: 'production' },
                    { label: 'Development', value: 'development' },
                    { label: 'Custom', value: 'custom' }
                  ]}
                  selected={['production']}
                  onChange={() => {}}
                  disabled={!isAuthenticated}
                />

                <TextField
                  label="Custom API URL"
                  placeholder="https://your-api-endpoint.com"
                  disabled={!isAuthenticated}
                  autoComplete="url"
                />

                <Checkbox
                  label="Enable debug mode"
                  checked={false}
                  onChange={() => {}}
                  disabled={!isAuthenticated}
                />

                <Checkbox
                  label="Send usage analytics"
                  checked={true}
                  onChange={() => {}}
                  disabled={!isAuthenticated}
                />

                <Divider />

                <ButtonGroup>
                  <Button icon={RefreshIcon} onClick={() => console.log('Reset settings')}>
                    Reset to Defaults
                  </Button>
                  <Button icon={ExportIcon} onClick={() => console.log('Export settings')}>
                    Export Settings
                  </Button>
                </ButtonGroup>
                </FormLayout>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      {/* Export Modal */}
      <ActionModal
        open={showExportModal}
        onClose={() => {
          if (!isLoading) {
            setShowExportModal(false)
            setExportProgress(0)
            setExportStatus('')
          }
        }}
        title="Export All Projects"
        primaryAction={{
          content: exportProgress > 0 ? 'Exporting...' : 'Export Projects',
          onAction: handleExportData,
          loading: isLoading,
          disabled: isLoading || exportProgress > 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              if (!isLoading) {
                setShowExportModal(false)
                setExportProgress(0)
                setExportStatus('')
              }
            }
          }
        ]}
      >
        <TextContainer>
          <Text as="p">
            This will export all your projects in the selected format. The export will include:
          </Text>

          {exportFormat === 'json' && (
            <>
              <ul>
                <li>Complete project data and metadata</li>
                <li>All project files {includeFullContent ? '(with full content)' : '(summary only)'}</li>
                <li>Chat history and conversations</li>
                <li>Project settings and configuration</li>
                <li>Export metadata and statistics</li>
              </ul>
              <Checkbox
                label="Include full file content (may result in larger file)"
                checked={includeFullContent}
                onChange={setIncludeFullContent}
                disabled={isLoading}
              />
            </>
          )}

          {exportFormat === 'csv' && (
            <>
              <ul>
                <li>Project summary with key statistics</li>
                <li>File and message counts</li>
                <li>Project status and timestamps</li>
                <li>Framework and architecture information</li>
              </ul>
              <Text variant="bodySm" as="p">
                CSV export provides a quick overview of all projects suitable for analysis.
              </Text>
            </>
          )}

          {(exportFormat === 'zip' || exportFormat === 'docker') && (
            <>
              <ul>
                <li>All project files and folders</li>
                <li>Configuration files</li>
                <li>Dependencies {includeDependencies ? '(included)' : '(excluded)'}</li>
                <li>Documentation and README</li>
              </ul>
              <Checkbox
                label="Include package.json and dependencies"
                checked={includeDependencies}
                onChange={setIncludeDependencies}
                disabled={isLoading}
              />
            </>
          )}

          {exportFormat === 'github' && (
            <Text variant="bodySm" as="p">
              GitHub export will create a repository with your project files and documentation.
            </Text>
          )}

          {exportProgress > 0 && (
            <>
              <Divider />
              <Text variant="headingMd" as="h3">Export Progress</Text>
              <div style={{ marginBottom: '8px' }}>
                <Text as="span">{exportStatus}</Text>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#f1f3f5',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}
              >
                <div
                  style={{
                    width: `${exportProgress}%`,
                    height: '100%',
                    backgroundColor: exportProgress === 100 ? '#00875a' : '#007ace',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <Text variant="bodySm" as="span">
                {exportProgress}% Complete
              </Text>
            </>
          )}

          <Divider />
          <Text variant="bodySm" as="span">
            The export may take a few moments depending on the size of your projects and selected format.
          </Text>
        </TextContainer>
      </ActionModal>

      {/* Delete Account Modal */}
      <ActionModal
        open={showDeleteModal}
        onClose={handleCloseDeleteModal}
        title="Delete Account"
        primaryAction={{
          content: deleteProgress > 0
            ? 'Deleting...'
            : (showPasswordInput
              ? (countdown > 0
                ? `Deleting in ${countdown}...`
                : (canDelete
                  ? 'Delete Account Permanently'
                  : 'Start Countdown'))
              : 'Continue'),
          onAction: handleDeleteAccount,
          loading: isLoading || authIsLoading,
          disabled: isLoading || authIsLoading || deleteProgress > 0 || countdown > 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCloseDeleteModal
          }
        ]}
      >
        <TextContainer>
          {!showPasswordInput ? (
            <>
              <Banner tone="critical">
                <Text as="p">
                  <strong>⚠️ WARNING: This action cannot be undone</strong>
                </Text>
              </Banner>

              <Text variant="headingMd" as="h3">What will be permanently deleted:</Text>
              <ul>
                <li><strong>All your projects</strong> - including code, files, and configurations</li>
                <li><strong>Chat history</strong> - all conversations and AI interactions</li>
                <li><strong>Your profile information</strong> - name, email, and settings</li>
                <li><strong>Account preferences</strong> - themes, templates, and customizations</li>
                <li><strong>Shared resources</strong> - any templates or components you've created</li>
              </ul>

              <Banner tone="warning">
                <Text variant="bodySm" as="p">
                  <strong>Before you delete your account:</strong><br/>
                  • Export any projects you want to keep<br/>
                  • Save important configurations or settings<br/>
                  • Inform team members if you have shared projects<br/>
                  • Cancel any active subscriptions or services
                </Text>
              </Banner>

              <Divider />

              <Text variant="headingMd" as="h3">Data Recovery</Text>
              <Text variant="bodySm" as="p">
                Once your account is deleted, there is no way to recover your data.
                We recommend exporting your projects before proceeding.
              </Text>

              <Button
                onClick={() => setShowExportModal(true)}
                disabled={isLoading}
              >
                Export Projects First
              </Button>
            </>
          ) : (
            <>
              <Banner tone="critical">
                <Text as="p">
                  <strong>⚠️ FINAL CONFIRMATION REQUIRED</strong>
                </Text>
              </Banner>

              <Text variant="headingMd" as="h3">Security Verification</Text>
              <TextField
                label="Enter your password"
                type="password"
                value={deletePassword}
                onChange={setDeletePassword}
                placeholder="Enter your current password"
                disabled={isLoading || authIsLoading}
                helpText="This verifies your identity before account deletion"
                autoComplete="current-password"
              />

              <Divider />

              <TextField
                label='Type "DELETE" to confirm'
                value={deleteConfirmation}
                onChange={setDeleteConfirmation}
                placeholder="DELETE"
                disabled={isLoading || authIsLoading}
                helpText="This confirms you understand this action cannot be undone"
                autoComplete="off"
              />

              {deleteProgress > 0 && (
                <>
                  <Divider />
                  <Text variant="headingMd" as="h3">Deletion Progress</Text>
                  <div style={{ marginBottom: '8px' }}>
                    <Text as="span">{deleteStatus}</Text>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f1f3f5',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: `${deleteProgress}%`,
                        height: '100%',
                        backgroundColor: deleteProgress === 100 ? '#00875a' : '#de3618',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <Text variant="bodySm" as="span">
                    {deleteProgress}% Complete
                  </Text>
                </>
              )}

              {authError && (
                <Banner tone="critical">
                  <Text variant="bodySm" as="p">{authError}</Text>
                </Banner>
              )}

              {countdown > 0 && (
                <Banner tone="warning">
                  <Text variant="bodySm" as="p">
                    <strong>Countdown:</strong> {countdown} seconds remaining until deletion begins.
                    You can still cancel by closing this dialog.
                  </Text>
                </Banner>
              )}

              {deleteStatus && deleteProgress === 0 && (
                <Banner tone={deleteStatus.includes('failed') ? 'critical' : 'info'}>
                  <Text variant="bodySm" as="p">{deleteStatus}</Text>
                </Banner>
              )}

              <Banner tone="warning">
                <Text variant="bodySm" as="p">
                  <strong>Important:</strong> Account deletion is permanent and cannot be reversed.
                  All your data will be immediately and permanently removed.
                </Text>
              </Banner>
            </>
          )}
        </TextContainer>
      </ActionModal>
    </Page>
  )
}

export default SettingsPage