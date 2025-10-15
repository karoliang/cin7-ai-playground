import React, { useState, useEffect } from 'react'
import {
  Modal,
  Card,
  FormLayout,
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
  ChoiceList,
  Banner,
  TextField,
  DatePicker
} from '@shopify/polaris'
import { ExportIcon, ArrowDownIcon, FilterIcon } from '@shopify/polaris-icons'
import { useAuthStore } from '@/stores/authStore'
import { exportService, BulkExportOptions, BulkExportProgress, BulkExportResult } from '@/services/exportService'
import { ActionModal } from '@/components/ui/PolarisComponents'
import { getUserProjects } from '@/services/projectService'

interface BulkExportModalProps {
  open: boolean
  onClose: () => void
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({ open, onClose }) => {
  const { user } = useAuthStore()
  const [exportOptions, setExportOptions] = useState<BulkExportOptions>(
    exportService.getDefaultBulkExportOptions()
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<BulkExportProgress | null>(null)
  const [exportId, setExportId] = useState<string>('')
  const [exportResult, setExportResult] = useState<BulkExportResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [previewProjects, setPreviewProjects] = useState<number>(0)
  const [estimatedSize, setEstimatedSize] = useState<number>(0)

  useEffect(() => {
    if (open && user) {
      loadProjectPreview()
    }
  }, [open, user, exportOptions.projectFilter])

  const loadProjectPreview = async () => {
    if (!user) return

    try {
      // Get all user projects
      const allProjects = await getUserProjects(user.id)

      // Apply the same filters that will be used for export
      const filteredProjects = filterProjectsForPreview(allProjects, exportOptions.projectFilter)

      setPreviewProjects(filteredProjects.length)

      // Estimate size based on actual projects
      const totalSize = filteredProjects.reduce((acc, project) => {
        return acc + exportService.getExportInfo(project, exportOptions as any).estimatedSize
      }, 0)
      setEstimatedSize(totalSize)

    } catch (error) {
      console.error('Failed to load project preview:', error)
      setPreviewProjects(0)
      setEstimatedSize(0)
    }
  }

  const filterProjectsForPreview = (projects: any[], filters?: BulkExportOptions['projectFilter']) => {
    if (!filters) return projects

    return projects.filter(project => {
      // Filter by status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(project.status)) {
          return false
        }
      }

      // Filter by template
      if (filters.template && filters.template.length > 0) {
        if (!project.metadata?.template || !filters.template.includes(project.metadata.template)) {
          return false
        }
      }

      // Filter by date range
      if (filters.dateRange) {
        const projectDate = new Date(project.updated_at)
        if (projectDate < filters.dateRange.start || projectDate > filters.dateRange.end) {
          return false
        }
      }

      // Filter by framework (basic detection)
      if (filters.frameworks && filters.frameworks.length > 0) {
        const hasReact = project.files?.some((f: any) => f.name.includes('.jsx') || f.name.includes('.tsx'))
        const hasVue = project.files?.some((f: any) => f.name.includes('.vue'))
        const hasTypeScript = project.files?.some((f: any) => f.name.includes('.ts') || f.name.includes('.tsx'))

        let framework = 'vanilla'
        if (hasReact) framework = hasTypeScript ? 'react-typescript' : 'react'
        else if (hasVue) framework = 'vue'
        else if (hasTypeScript) framework = 'typescript'

        if (!filters.frameworks.includes(framework)) {
          return false
        }
      }

      return true
    })
  }

  const handleExport = async () => {
    if (!user) {
      console.error('User not authenticated')
      return
    }

    if (previewProjects === 0) {
      console.error('No projects to export')
      return
    }

    setIsExporting(true)
    setExportResult(null)

    const newExportId = Date.now().toString()
    setExportId(newExportId)

    // Add progress callback
    exportService.addProgressCallback(newExportId, (progress: BulkExportProgress) => {
      setExportProgress(progress)

      // Auto-clear error progress after 5 seconds
      if (progress.stage === 'error') {
        setTimeout(() => {
          setExportProgress(null)
        }, 5000)
      }
    })

    try {
      const result = await exportService.exportAllProjects(user.id, exportOptions, newExportId)
      setExportResult(result)

      if (result.success && result.blob) {
        // Auto-download the file
        exportService.downloadFile(result.blob, result.filename || 'bulk-export.zip')

        // Show success notification
        console.log(`Successfully exported ${result.summary.successfulExports} projects`)
      } else {
        // Handle partial success or failure
        if (result.summary.successfulExports > 0) {
          console.warn(`Partial export: ${result.summary.successfulExports} succeeded, ${result.summary.failedExports} failed`)
        } else {
          console.error('Export failed completely:', result.error)
        }
      }
    } catch (error) {
      console.error('Bulk export failed:', error)

      // Set error result for UI display
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during export',
        summary: {
          totalProjects: previewProjects,
          successfulExports: 0,
          failedExports: previewProjects,
          skippedProjects: 0,
          totalSize: 0,
          exportedProjects: []
        }
      })
    } finally {
      setIsExporting(false)

      // Keep progress visible for 3 seconds on success, longer on error
      const timeout = exportResult?.success ? 3000 : 5000
      setTimeout(() => {
        setExportProgress(null)
      }, timeout)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatOptions = [
    { label: 'ZIP Archive (Recommended)', value: 'zip' },
    { label: 'GitHub Repository', value: 'github' },
    { label: 'Docker Container', value: 'docker' }
  ]

  const compressionOptions = [
    { label: 'Low (Faster)', value: 'low' },
    { label: 'Medium (Balanced)', value: 'medium' },
    { label: 'High (Smaller)', value: 'high' }
  ]

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' }
  ]

  const templateOptions = [
    { label: 'Sales Dashboard', value: 'cin7-sales' },
    { label: 'Inventory Management', value: 'cin7-inventory' },
    { label: 'Analytics Dashboard', value: 'cin7-analytics' },
    { label: 'Multi-page App', value: 'multi-page-app' },
    { label: 'Mobile Commerce', value: 'mobile-commerce' },
    { label: 'E-commerce', value: 'e-commerce' },
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Blog', value: 'blog' },
    { label: 'Portfolio', value: 'portfolio' }
  ]

  const frameworkOptions = [
    { label: 'React', value: 'react' },
    { label: 'React + TypeScript', value: 'react-typescript' },
    { label: 'Vue', value: 'vue' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Vanilla JavaScript', value: 'vanilla' }
  ]

  const updateProjectFilter = (filterType: string, values: string[]) => {
    setExportOptions({
      ...exportOptions,
      projectFilter: {
        ...exportOptions.projectFilter,
        [filterType]: values.length > 0 ? values : undefined
      }
    })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Export All Projects"
        size="large"
        primaryAction={
          exportResult?.success
            ? undefined
            : {
                content: isExporting ? 'Exporting...' : `Export ${previewProjects} Projects`,
                onAction: handleExport,
                loading: isExporting,
                disabled: !user || isExporting || previewProjects === 0,
                icon: ExportIcon
              }
        }
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: onClose,
            disabled: isExporting
          }
        ]}
      >
        <Modal.Section>
          {exportResult?.success ? (
            <Card>
              <BlockStack gap="400">
                <Banner tone="success" title="Bulk Export Successful!">
                  <Text as="p">
                    Your projects have been exported successfully. The download should have started automatically.
                  </Text>
                </Banner>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm">
                    Total Projects: {exportResult.summary.totalProjects}
                  </Text>
                  <Text as="p" variant="bodySm">
                    Successful: {exportResult.summary.successfulExports}
                  </Text>
                  <Text as="p" variant="bodySm">
                    Failed: {exportResult.summary.failedExports}
                  </Text>
                  <Text as="p" variant="bodySm">
                    Skipped: {exportResult.summary.skippedProjects}
                  </Text>
                  <Text as="p" variant="bodySm">
                    File size: {formatFileSize(exportResult.size || 0)}
                  </Text>
                  <Text as="p" variant="bodySm">
                    File name: {exportResult.filename}
                  </Text>
                </BlockStack>

                {exportResult.summary.failedExports > 0 && (
                  <Banner tone="warning">
                    <Text as="p">
                      {exportResult.summary.failedExports} project(s) failed to export.
                      Check the export details for more information.
                    </Text>
                  </Banner>
                )}

                <InlineStack gap="200">
                  <Button
                    icon={ArrowDownIcon}
                    onClick={() => {
                      if (exportResult.blob) {
                        exportService.downloadFile(
                          exportResult.blob,
                          exportResult.filename || 'bulk-export.zip'
                        )
                      }
                    }}
                  >
                    Download Again
                  </Button>
                  <Button onClick={onClose}>Close</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          ) : (
            <BlockStack gap="400">
              {exportProgress && (
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text variant="headingSm" as="h3">
                        {exportProgress.stage.charAt(0).toUpperCase() + exportProgress.stage.slice(1)}
                      </Text>
                      <Badge tone={exportProgress.stage === 'error' ? 'critical' : 'info'}>
                        {`${exportProgress.progress}%`}
                      </Badge>
                    </InlineStack>
                    <ProgressBar
                      progress={exportProgress.progress}
                      size="small"
                      tone={exportProgress.stage === 'error' ? 'critical' : 'primary'}
                    />
                    <Text as="p" variant="bodySm">
                      {exportProgress.message}
                    </Text>
                    {exportProgress.currentProject && (
                      <Text as="p" variant="bodySm">
                        Current: {exportProgress.currentProject} ({exportProgress.completedProjects}/{exportProgress.totalProjects})
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Project Preview */}
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">Export Summary</Text>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Projects to export:</Text>
                    <Badge>{previewProjects.toString()}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">Estimated size:</Text>
                    <Text as="span" variant="bodySm">{formatFileSize(estimatedSize)}</Text>
                  </InlineStack>
                  {previewProjects === 0 && (
                    <Banner tone="warning">
                      <Text as="p">No projects found matching the current filters.</Text>
                    </Banner>
                  )}
                </BlockStack>
              </Card>

              {/* Basic Export Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Export Settings</Text>
                <FormLayout>
                  <Select
                    label="Export Format"
                    options={formatOptions}
                    value={exportOptions.format}
                    onChange={(value) =>
                      setExportOptions({
                        ...exportOptions,
                        format: value as 'zip' | 'github' | 'docker'
                      })
                    }
                    disabled={isExporting}
                  />

                  <Select
                    label="Compression Level"
                    options={compressionOptions}
                    value={exportOptions.compressionLevel}
                    onChange={(value) =>
                      setExportOptions({
                        ...exportOptions,
                        compressionLevel: value as 'low' | 'medium' | 'high'
                      })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Include dependencies (package.json)"
                    checked={exportOptions.includeDependencies}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, includeDependencies: value })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Include README documentation"
                    checked={exportOptions.includeReadme}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, includeReadme: value })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Include build scripts and configurations"
                    checked={exportOptions.includeBuildScripts}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, includeBuildScripts: value })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Include project metadata"
                    checked={exportOptions.includeMetadata}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, includeMetadata: value })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Generate export manifest"
                    checked={exportOptions.generateManifest}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, generateManifest: value })
                    }
                    disabled={isExporting}
                  />

                  <Checkbox
                    label="Minify code (smaller file size)"
                    checked={exportOptions.minifyCode}
                    onChange={(value) =>
                      setExportOptions({ ...exportOptions, minifyCode: value })
                    }
                    disabled={isExporting}
                  />
                </FormLayout>
                </BlockStack>
              </Card>

              {/* Project Filters */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Project Filters</Text>
                    <Button
                      size="slim"
                      icon={FilterIcon}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      {showFilters ? 'Hide' : 'Show'} Filters
                    </Button>
                  </InlineStack>
                  {showFilters && (
                    <FormLayout>
                      <ChoiceList
                        title="Project Status"
                        choices={statusOptions}
                        selected={exportOptions.projectFilter?.status || []}
                        onChange={(values) => updateProjectFilter('status', values as string[])}
                        allowMultiple
                      />

                      <ChoiceList
                        title="Templates"
                        choices={templateOptions}
                        selected={exportOptions.projectFilter?.template || []}
                        onChange={(values) => updateProjectFilter('template', values as string[])}
                        allowMultiple
                      />

                      <ChoiceList
                        title="Frameworks"
                        choices={frameworkOptions}
                        selected={exportOptions.projectFilter?.frameworks || []}
                        onChange={(values) => updateProjectFilter('frameworks', values as string[])}
                        allowMultiple
                      />
                    </FormLayout>
                  )}
                </BlockStack>
              </Card>

              {/* Advanced Options */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Advanced Options</Text>
                    <Button
                      size="slim"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced
                    </Button>
                  </InlineStack>
                  {showAdvanced && (
                    <FormLayout>
                      <Text as="p" variant="bodySm">
                        Advanced options allow you to customize the export process further.
                        Date filtering and custom configurations will be available in future updates.
                      </Text>
                    </FormLayout>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </>
  )
}

export default BulkExportModal