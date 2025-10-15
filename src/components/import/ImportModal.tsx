import React, { useState, useRef } from 'react'
import {
  Modal,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  ButtonGroup,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  ProgressBar,
  Divider,
  Banner,
  DropZone,
  Thumbnail,
  Icon
} from '@shopify/polaris'
import {
  ImportIcon,
  CircleUpIcon,
  MobileIcon,
  FileIcon
} from '@shopify/polaris-icons'
import {
  ImportOptions,
  ImportSource,
  ImportProgress,
  ImportResult,
  ImportValidation,
  GitHubRepoInfo
} from '@/types'
import { importService } from '@/services/importService'
import { useNavigate } from 'react-router-dom'

interface ImportModalProps {
  open: boolean
  onClose: () => void
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importSource, setImportSource] = useState<'file' | 'github'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [githubBranch, setGithubBranch] = useState('main')
  const [importOptions, setImportOptions] = useState<ImportOptions>(
    importService.getDefaultImportOptions()
  )
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [validation, setValidation] = useState<ImportValidation | null>(null)
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null)

  const handleFileDrop = (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setValidation(null)
      setImportResult(null)
    }
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setValidation(null)
      setImportResult(null)
    }
  }

  const validateImport = async () => {
    const source: ImportSource = {
      type: importSource,
      ...(importSource === 'file' ? { file: selectedFile || undefined } : { url: githubUrl, branch: githubBranch })
    }

    try {
      const validation = await importService.validateImportSource(source)
      setValidation(validation)

      if (importSource === 'github' && validation.isValid) {
        // Fetch repo info for valid GitHub URLs
        const info = await importService.getGitHubRepoInfo(githubUrl)
        setRepoInfo(info)
      }
    } catch (error) {
      setValidation({
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: []
      })
    }
  }

  const handleImport = async () => {
    const source: ImportSource = {
      type: importSource,
      ...(importSource === 'file' ? { file: selectedFile || undefined } : { url: githubUrl, branch: githubBranch })
    }

    setIsImporting(true)
    setImportResult(null)
    setImportProgress(null)

    const importId = Date.now().toString()

    // Add progress callback
    importService.addProgressCallback(importId, (progress: ImportProgress) => {
      setImportProgress(progress)
    })

    try {
      const result = await importService.importProject(source, importOptions, importId)
      setImportResult(result)

      if (result.success && result.project) {
        // Navigate to the imported project after a short delay
        setTimeout(() => {
          navigate(`/project/${result.project!.id}`)
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      })
    } finally {
      setIsImporting(false)
      setTimeout(() => {
        setImportProgress(null)
      }, 3000)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setGithubUrl('')
    setGithubBranch('main')
    setValidation(null)
    setRepoInfo(null)
    setImportResult(null)
    setImportProgress(null)
  }

  const handleClose = () => {
    if (!isImporting) {
      resetForm()
      onClose()
    }
  }

  const isFormValid = () => {
    if (importSource === 'file') {
      return selectedFile !== null
    } else {
      return githubUrl.trim() !== '' && (!validation || validation.isValid)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fileUploadMarkup = (
    <Card>
      <DropZone onDrop={handleFileDrop} accept=".zip" allowMultiple={false}>
        {selectedFile ? (
          <BlockStack gap="200">
            <Thumbnail size="large" alt={selectedFile.name} source={FileIcon} />
            <BlockStack gap="100">
              <Text as="p" variant="bodySm">
                <strong>{selectedFile.name}</strong>
              </Text>
              <Text as="p" variant="bodySm">
                {formatFileSize(selectedFile.size)}
              </Text>
            </BlockStack>
            <Button onClick={() => setSelectedFile(null)}>Remove file</Button>
          </BlockStack>
        ) : (
          <DropZone.FileUpload actionHint="or drop files" />
        )}
      </DropZone>
    </Card>
  )

  const githubImportMarkup = (
    <Card>
      <BlockStack gap="400">
        <FormLayout>
          <TextField
            label="GitHub Repository URL"
            placeholder="https://github.com/username/repository"
            value={githubUrl}
            onChange={setGithubUrl}
            onBlur={validateImport}
            autoComplete="off"
            error={validation?.errors.find(e => e.includes('URL'))}
            helpText="Enter the URL of the GitHub repository you want to import"
          />
          <TextField
            label="Branch"
            placeholder="main"
            value={githubBranch}
            onChange={setGithubBranch}
            autoComplete="off"
            helpText="Specify the branch to import (defaults to main)"
          />
        </FormLayout>

        {repoInfo && (
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Repository Information</Text>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Name:</Text>
                  <Text as="span" variant="bodySm">{repoInfo.name}</Text>
                </InlineStack>
                {repoInfo.description && (
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm">Description:</Text>
                    <Text as="span" variant="bodySm">{repoInfo.description}</Text>
                  </BlockStack>
                )}
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Default Branch:</Text>
                  <Text as="span" variant="bodySm">{repoInfo.defaultBranch}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Languages:</Text>
                  <InlineStack gap="200">
                    {repoInfo.languages.map((lang, index) => (
                      <Badge key={index}>{lang}</Badge>
                    ))}
                  </InlineStack>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Files:</Text>
                  <Text as="span" variant="bodySm">{repoInfo.fileCount}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm">Size:</Text>
                  <Text as="span" variant="bodySm">{formatFileSize(repoInfo.size * 1024)}</Text>
                </InlineStack>
                {repoInfo.isPrivate && (
                  <Badge tone="attention">Private Repository</Badge>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Card>
  )

  const importSourceOptions = [
    { label: 'ZIP File', value: 'file' },
    { label: 'GitHub Repository', value: 'github' }
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Project"
      size="large"
      primaryAction={
        importResult?.success
          ? undefined
          : {
              content: isImporting ? 'Importing...' : 'Import Project',
              onAction: handleImport,
              loading: isImporting,
              disabled: !isFormValid() || isImporting,
              icon: ImportIcon
            }
      }
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleClose,
          disabled: isImporting
        }
      ]}
    >
      <Modal.Section>
        {importResult?.success ? (
          <Card>
            <BlockStack gap="400">
              <Banner tone="success" title="Import Successful!">
                <Text as="p">
                  Your project has been imported successfully. You will be redirected to the project page shortly.
                </Text>
              </Banner>

              {importResult.importedFiles && (
                <Text as="p" variant="bodySm">
                  Files imported: {importResult.importedFiles}
                </Text>
              )}

              <InlineStack gap="200">
                <Button
                  onClick={() => {
                    if (importResult.project) {
                      navigate(`/project/${importResult.project.id}`)
                      onClose()
                    }
                  }}
                >
                  View Project
                </Button>
                <Button onClick={handleClose}>Close</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        ) : (
          <BlockStack gap="400">
            {importProgress && (
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="headingSm" as="h3">
                      {importProgress.stage.charAt(0).toUpperCase() + importProgress.stage.slice(1)}
                    </Text>
                    <Badge tone={importProgress.stage === 'error' ? 'critical' : 'info'}>
                      {importProgress.progress}%
                    </Badge>
                  </InlineStack>
                  <ProgressBar
                    progress={importProgress.progress}
                    size="small"
                    tone={importProgress.stage === 'error' ? 'critical' : 'primary'}
                  />
                  <Text as="p" variant="bodySm">
                    {importProgress.message}
                    {importProgress.currentFile && (
                      <> • {importProgress.currentFile}</>
                    )}
                  </Text>
                </BlockStack>
              </Card>
            )}

            {validation && !validation.isValid && (
              <Banner tone="critical" title="Validation Error">
                <Text as="p">
                  {validation.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </Text>
              </Banner>
            )}

            {importResult?.error && (
              <Banner tone="critical" title="Import Failed">
                <Text as="p">{importResult.error}</Text>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Import Source</Text>
                <FormLayout>
                  <Select
                    label="Import Type"
                    options={importSourceOptions}
                    value={importSource}
                    onChange={(value) => {
                      setImportSource(value as 'file' | 'github')
                      setValidation(null)
                      setRepoInfo(null)
                    }}
                    disabled={isImporting}
                  />

                  {importSource === 'file' ? fileUploadMarkup : githubImportMarkup}
                </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Import Options</Text>
                  <FormLayout>
                    <TextField
                      label="Project Name"
                      placeholder="My Imported Project"
                      value={importOptions.projectName || ''}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, projectName: value })
                      }
                      disabled={isImporting}
                      autoComplete="off"
                    />

                    <TextField
                      label="Project Description"
                      placeholder="Description of the imported project"
                      value={importOptions.projectDescription || ''}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, projectDescription: value })
                      }
                      disabled={isImporting}
                      multiline={3}
                      autoComplete="off"
                    />

                    <Checkbox
                      label="Create new project"
                      checked={importOptions.createNewProject}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, createNewProject: value })
                      }
                      disabled={isImporting}
                    />

                    <Checkbox
                      label="Auto-detect framework"
                      checked={importOptions.frameworkDetection}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, frameworkDetection: value })
                      }
                      disabled={isImporting}
                    />

                    <Checkbox
                      label="Include test files"
                      checked={importOptions.includeTests}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, includeTests: value })
                      }
                      disabled={isImporting}
                    />

                    <Checkbox
                      label="Skip dependency installation"
                      checked={importOptions.skipDependencies}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, skipDependencies: value })
                      }
                      disabled={isImporting}
                    />

                    <Checkbox
                      label="Overwrite existing files"
                      checked={importOptions.overwriteExisting}
                      onChange={(value) =>
                        setImportOptions({ ...importOptions, overwriteExisting: value })
                      }
                      disabled={isImporting}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </BlockStack>
        )}
      </Modal.Section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </Modal>
  )
}

export default ImportModal