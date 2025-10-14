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
  Stack,
  Divider,
  ChoiceList,
  RangeSlider,
  TextStyle,
  Modal,
  TextContainer
} from '@shopify/polaris'
import {
  SettingsMajor,
  ExportMinor,
  ImportMinor,
  DeleteMinor,
  CirclePlusMajor,
  RefreshMinor
} from '@shopify/polaris-icons'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/ui/ThemeProvider'
import { ActionModal } from '@/components/ui/PolarisComponents'

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, isAuthenticated } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const [selectedTab, setSelectedTab] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Profile settings
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profileCompany, setProfileCompany] = useState('')

  // Project settings
  const [defaultTemplate, setDefaultTemplate] = useState('dashboard')
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(30)

  // Export settings
  const [exportFormat, setExportFormat] = useState('zip')
  const [includeDependencies, setIncludeDependencies] = useState(true)

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
    console.log('Exporting data...')
    // TODO: Implement data export functionality
    setShowExportModal(false)
  }

  const handleDeleteAccount = async () => {
    console.log('Deleting account...')
    // TODO: Implement account deletion
    setShowDeleteModal(false)
  }

  const themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' }
  ]

  const templateOptions = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'E-commerce', value: 'ecommerce' },
    { label: 'Portfolio', value: 'portfolio' },
    { label: 'Custom', value: 'custom' }
  ]

  const exportFormatOptions = [
    { label: 'ZIP Archive', value: 'zip' },
    { label: 'GitHub Repository', value: 'github' },
    { label: 'Docker Container', value: 'docker' }
  ]

  return (
    <Page
      title="Settings"
      breadcrumbs={[{ content: 'Dashboard', url: '/' }]}
      primaryAction={{
        content: 'Save Changes',
        onAction: handleSaveProfile,
        loading: isLoading,
        disabled: !isAuthenticated
      }}
    >
      <Layout>
        <Layout.Section oneThird>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} fitted />
          </Card>

          <Card sectioned>
            <Text variant="headingMd" as="h3">Quick Actions</Text>
            <Stack vertical spacing="tight">
              <Button icon={ExportMinor} fullWidth onClick={() => setShowExportModal(true)}>
                Export All Projects
              </Button>
              <Button icon={ImportMinor} fullWidth>
                Import Projects
              </Button>
              <Button icon={RefreshMinor} fullWidth>
                Clear Cache
              </Button>
              <Divider />
              <Button icon={DeleteMinor} fullWidth destructive onClick={() => setShowDeleteModal(true)}>
                Delete Account
              </Button>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section twoThirds>
          {selectedTab === 0 && (
            <Card title="Profile Settings" sectioned>
              <FormLayout>
                <TextField
                  label="Full Name"
                  value={profileName}
                  onChange={setProfileName}
                  placeholder="Enter your full name"
                  disabled={!isAuthenticated}
                />
                <TextField
                  label="Email Address"
                  value={profileEmail}
                  onChange={setProfileEmail}
                  placeholder="your.email@example.com"
                  type="email"
                  disabled={!isAuthenticated}
                />
                <TextField
                  label="Company"
                  value={profileCompany}
                  onChange={setProfileCompany}
                  placeholder="Your company name"
                  disabled={!isAuthenticated}
                />
                <Select
                  label="Theme Preference"
                  options={themeOptions}
                  value={resolvedTheme}
                  onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                />
                <Divider />
                <Text variant="headingMd" as="h3">Account Status</Text>
                <Stack>
                  <Badge status="success">Active</Badge>
                  <Text variant="bodySm" color="subdued">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </Text>
                </Stack>
              </FormLayout>
            </Card>
          )}

          {selectedTab === 1 && (
            <Card title="Project Settings" sectioned>
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
                    onChange={setAutoSaveInterval}
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
            </Card>
          )}

          {selectedTab === 2 && (
            <Card title="Export Settings" sectioned>
              <FormLayout>
                <Select
                  label="Default export format"
                  options={exportFormatOptions}
                  value={exportFormat}
                  onChange={setExportFormat}
                  disabled={!isAuthenticated}
                />
                <Checkbox
                  label="Include package.json and dependencies"
                  checked={includeDependencies}
                  onChange={setIncludeDependencies}
                  disabled={!isAuthenticated}
                />
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
                <Banner status="info">
                  <Text variant="bodySm">
                    Export settings are saved per project. You can override these settings when exporting individual projects.
                  </Text>
                </Banner>
              </FormLayout>
            </Card>
          )}

          {selectedTab === 3 && (
            <Card title="Advanced Settings" sectioned>
              <FormLayout>
                <Banner status="warning" title="Advanced Features">
                  <Text variant="bodySm">
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
                  <Button icon={RefreshMinor} onClick={() => console.log('Reset settings')}>
                    Reset to Defaults
                  </Button>
                  <Button icon={ExportMinor} onClick={() => console.log('Export settings')}>
                    Export Settings
                  </Button>
                </ButtonGroup>
              </FormLayout>
            </Card>
          )}
        </Layout.Section>
      </Layout>

      {/* Export Modal */}
      <ActionModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export All Projects"
        primaryAction={{
          content: 'Export Projects',
          onAction: handleExportData,
          loading: false
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowExportModal(false)
          }
        ]}
      >
        <TextContainer>
          <Text>
            This will export all your projects as a ZIP archive. The export will include:
          </Text>
          <ul>
            <li>All project files and folders</li>
            <li>Configuration files</li>
            <li>Dependencies (if enabled)</li>
            <li>Documentation</li>
          </ul>
          <Text>
            The export may take a few moments depending on the size of your projects.
          </Text>
        </TextContainer>
      </ActionModal>

      {/* Delete Account Modal */}
      <ActionModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        primaryAction={{
          content: 'Delete Account',
          onAction: handleDeleteAccount,
          loading: false,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowDeleteModal(false)
          }
        ]}
      >
        <TextContainer>
          <Banner status="critical">
            <Text>
              This action cannot be undone. Deleting your account will permanently remove:
            </Text>
          </Banner>
          <ul>
            <li>All your projects and files</li>
            <li>Your profile information</li>
            <li>Account settings and preferences</li>
            <li>Any shared templates or components</li>
          </ul>
          <Text>
            Please consider exporting your projects before deleting your account.
          </Text>
        </TextContainer>
      </ActionModal>
    </Page>
  )
}