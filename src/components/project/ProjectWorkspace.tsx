import React, { useState } from 'react'
import {
  Layout,
  Card,
  Text,
  Tabs,
  ButtonGroup,
  Button,
  Badge,
  Icon,
  Stack,
  Spinner,
  Scrollable,
  FormLayout,
  TextField,
  ActionList,
  Popover,
  Select,
  Checkbox,
  Divider
} from '@shopify/polaris'
import {
  ChatMajor,
  CodeMajor,
  ViewMajor,
  SettingsMajor,
  CirclePlusMinor,
  EditMinor,
  DeleteMinor,
  ExportMinor,
  ImportMinor,
  RefreshMinor,
  MobileMajor,
  DesktopMajor
} from '@shopify/polaris-icons'
import { useProjectStore } from '@/stores/projectStore'
import { useTheme } from '@/components/ui/ThemeProvider'
import { ExportModal } from '@/components/export/ExportModal'

export const ProjectWorkspace: React.FC = () => {
  const {
    currentProject,
    files,
    activeFile,
    messages,
    isGenerating,
    setActiveFile,
    addFile,
    deleteFile,
    updateFile
  } = useProjectStore()
  const { resolvedTheme } = useTheme()

  const [selectedTab, setSelectedTab] = useState(0)
  const [chatMessage, setChatMessage] = useState('')
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [fileActionActive, setFileActionActive] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  const handleChatSend = () => {
    if (chatMessage.trim()) {
      // TODO: Implement chat functionality
      console.log('Sending chat message:', chatMessage)
      setChatMessage('')
    }
  }

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      addFile({
        name: newFileName,
        type: 'javascript',
        content: `// ${newFileName}\n// Generated file\n\nexport default {}`,
        language: 'javascript'
      })
      setNewFileName('')
      setShowNewFileDialog(false)
    }
  }

  const tabs = [
    {
      id: 'chat',
      content: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon source={ChatMajor} />
          AI Assistant
        </span>
      ),
      panelID: 'chat-panel'
    },
    {
      id: 'files',
      content: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon source={CodeMajor} />
          Files ({files.length})
        </span>
      ),
      panelID: 'files-panel'
    },
    {
      id: 'preview',
      content: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon source={ViewMajor} />
          Preview
        </span>
      ),
      panelID: 'preview-panel'
    }
  ]

  const fileActionItems = [
    {
      content: 'Create new file',
      icon: CirclePlusMinor,
      onAction: () => setShowNewFileDialog(true)
    },
    {
      content: 'Import file',
      icon: ImportMinor,
      onAction: () => console.log('Import file')
    },
    {
      content: 'Export project',
      icon: ExportMinor,
      onAction: () => setShowExportModal(true)
    }
  ]

  return (
    <Layout>
      <Layout.Section oneHalf>
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {selectedTab === 0 && (
              <Card.Section title="AI Assistant">
                <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                  <Scrollable style={{ flex: 1, marginBottom: '1rem' }}>
                    <div style={{ padding: '1rem', minHeight: '300px' }}>
                      {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#6b7280' }}>
                          <Icon source={ChatMajor} size="large" color="base" />
                          <Text variant="bodyLg" as="p">
                            Start a conversation with the AI assistant
                          </Text>
                          <Text variant="bodySm" as="p" color="subdued">
                            Ask questions, request changes, or get help with your project
                          </Text>
                        </div>
                      ) : (
                        <div>
                          {messages.map((message: any, index) => (
                            <div key={index} style={{ marginBottom: '1rem' }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '0.5rem'
                              }}>
                                <Badge status={message.role === 'user' ? 'success' : 'info'}>
                                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                                </Badge>
                              </div>
                              <div style={{
                                backgroundColor: message.role === 'user'
                                  ? 'var(--p-color-bg-surface-success-subdued)'
                                  : 'var(--p-color-bg-surface-subdued)',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                maxWidth: '80%',
                                marginLeft: message.role === 'user' ? 'auto' : '0'
                              }}>
                                <Text variant="bodySm">{message.content}</Text>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Scrollable>

                  <div style={{ borderTop: '1px solid var(--p-color-border)', paddingTop: '1rem' }}>
                    <FormLayout>
                      <TextField
                        placeholder="Ask the AI assistant to help with your project..."
                        value={chatMessage}
                        onChange={setChatMessage}
                        multiline={2}
                        connectedRight={
                          <Button
                            onClick={handleChatSend}
                            disabled={!chatMessage.trim() || isGenerating}
                            primary
                          >
                            Send
                          </Button>
                        }
                      />
                    </FormLayout>
                  </div>
                </div>
              </Card.Section>
            )}

            {selectedTab === 1 && (
              <Card.Section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Text variant="headingMd">Project Files</Text>
                  <Popover
                    active={fileActionActive}
                    activator={
                      <Button
                        icon={SettingsMajor}
                        onClick={() => setFileActionActive(!fileActionActive)}
                      />
                    }
                    onClose={() => setFileActionActive(false)}
                  >
                    <ActionList items={fileActionItems} />
                  </Popover>
                </div>

                {files.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <Icon source={CodeMajor} size="large" color="base" />
                    <Text variant="bodyLg" as="p">
                      No files yet
                    </Text>
                    <Text variant="bodySm" as="p" color="subdued">
                      Start by creating your first file or using the AI assistant
                    </Text>
                    <Button onClick={() => setShowNewFileDialog(true)} primary>
                      Create First File
                    </Button>
                  </div>
                ) : (
                  <Scrollable style={{ height: '350px' }}>
                    <Stack vertical spacing="tight">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: activeFile?.id === file.id
                              ? 'var(--p-color-bg-surface-selected)'
                              : 'var(--p-color-bg-surface)',
                            border: activeFile?.id === file.id
                              ? '1px solid var(--p-color-border-interactive)'
                              : '1px solid var(--p-color-border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setActiveFile(file.id)}
                        >
                          <div style={{ flex: 1 }}>
                            <Text variant="bodySm" fontWeight={activeFile?.id === file.id ? 'semibold' : 'regular'}>
                              {file.name}
                            </Text>
                            <Text variant="bodyXs" color="subdued">
                              {file.language || file.type} • {file.content.length} characters
                            </Text>
                          </div>
                          <ButtonGroup>
                            <Button
                              icon={EditMinor}
                              size="slim"
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Implement file editing
                              }}
                            />
                            <Button
                              icon={DeleteMinor}
                              size="slim"
                              destructive
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteFile(file.id)
                              }}
                            />
                          </ButtonGroup>
                        </div>
                      ))}
                    </Stack>
                  </Scrollable>
                )}

                {activeFile && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--p-color-bg-surface-subdued)', borderRadius: '0.5rem' }}>
                    <Text variant="bodySm" fontWeight="semibold">
                      Currently Editing: {activeFile.name}
                    </Text>
                    <Text variant="bodyXs" color="subdued">
                      {/* TODO: Add file preview snippet */}
                      Click to edit in the code editor
                    </Text>
                  </div>
                )}
              </Card.Section>
            )}

            {selectedTab === 2 && (
              <Card.Section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Text variant="headingMd">Live Preview</Text>
                  <ButtonGroup segmented>
                    <Button
                      icon={DesktopMajor}
                      pressed={previewMode === 'desktop'}
                      onClick={() => setPreviewMode('desktop')}
                    >
                      Desktop
                    </Button>
                    <Button
                      icon={MobileMajor}
                      pressed={previewMode === 'mobile'}
                      onClick={() => setPreviewMode('mobile')}
                    >
                      Mobile
                    </Button>
                  </ButtonGroup>
                </div>

                <div
                  style={{
                    height: '350px',
                    backgroundColor: 'var(--p-color-bg-surface-subdued)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed var(--p-color-border)',
                    maxWidth: previewMode === 'mobile' ? '375px' : '100%',
                    margin: '0 auto'
                  }}
                >
                  {isGenerating ? (
                    <Stack vertical alignment="center" spacing="tight">
                      <Spinner size="large" />
                      <Text variant="bodyLg" as="p">
                        Generating Preview...
                      </Text>
                      <Text variant="bodySm" as="p" color="subdued">
                        AI is building your application
                      </Text>
                    </Stack>
                  ) : files.length === 0 ? (
                    <Stack vertical alignment="center" spacing="tight">
                      <Icon source={ViewMajor} size="large" color="base" />
                      <Text variant="bodyLg" as="p">
                        No preview available
                      </Text>
                      <Text variant="bodySm" as="p" color="subdued">
                        Create files to see a live preview
                      </Text>
                    </Stack>
                  ) : (
                    <Stack vertical alignment="center" spacing="tight">
                      <Icon source={RefreshMinor} size="large" color="base" />
                      <Text variant="bodyLg" as="p">
                        Preview Ready
                      </Text>
                      <Text variant="bodySm" as="p" color="subdued">
                        Live preview of your application
                      </Text>
                      <Button onClick={() => console.log('Open in new tab')}>
                        Open in New Tab
                      </Button>
                    </Stack>
                  )}
                </div>
              </Card.Section>
            )}
          </Tabs>
        </Card>
      </Layout.Section>

      <Layout.Section oneHalf>
        <Card title="Project Information" sectioned>
          <Stack vertical spacing="loose">
            <div>
              <Text variant="headingSm" as="h3">Project Details</Text>
              <Text variant="bodySm" as="p" color="subdued">
                Name: {currentProject?.name || 'Untitled Project'}
              </Text>
              <Text variant="bodySm" as="p" color="subdued">
                Description: {currentProject?.description || 'No description provided'}
              </Text>
              <Text variant="bodySm" as="p" color="subdued">
                Files: {files.length} • Messages: {messages.length}
              </Text>
            </div>

            <Divider />

            <div>
              <Text variant="headingSm" as="h3">Project Actions</Text>
              <Stack vertical spacing="tight">
                <Button icon={RefreshMinor} fullWidth>
                  Regenerate Project
                </Button>
                <Button icon={ExportMinor} fullWidth onClick={() => setShowExportModal(true)}>
                  Export as ZIP
                </Button>
                <Button icon={SettingsMajor} fullWidth>
                  Project Settings
                </Button>
              </Stack>
            </div>

            <Divider />

            <div>
              <Text variant="headingSm" as="h3">Development Status</Text>
              <Stack vertical spacing="tight">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge status={isGenerating ? 'attention' : 'success'}>
                    {isGenerating ? 'Generating' : 'Ready'}
                  </Badge>
                  {isGenerating && <Spinner size="small" />}
                </div>
                <Text variant="bodyXs" as="p" color="subdued">
                  Last updated: {new Date(currentProject?.updated_at || Date.now()).toLocaleString()}
                </Text>
              </Stack>
            </div>
          </Stack>
        </Card>

        {showNewFileDialog && (
          <Card title="Create New File" sectioned>
            <FormLayout>
              <TextField
                label="File name"
                placeholder="e.g., App.jsx, styles.css, utils.js"
                value={newFileName}
                onChange={setNewFileName}
                autoComplete="off"
              />
              <Select
                label="File type"
                options={[
                  { label: 'JavaScript', value: 'javascript' },
                  { label: 'TypeScript', value: 'typescript' },
                  { label: 'CSS', value: 'css' },
                  { label: 'HTML', value: 'html' },
                  { label: 'JSON', value: 'json' }
                ]}
                value="javascript"
                onChange={() => {}}
              />
              <ButtonGroup>
                <Button onClick={() => setShowNewFileDialog(false)}>
                  Cancel
                </Button>
                <Button primary onClick={handleCreateFile} disabled={!newFileName.trim()}>
                  Create File
                </Button>
              </ButtonGroup>
            </FormLayout>
          </Card>
        )}
      </Layout.Section>
    </Layout>

      {/* Export Modal */}
      {currentProject && (
        <ExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          project={currentProject}
        />
      )}
    </>
  )
}