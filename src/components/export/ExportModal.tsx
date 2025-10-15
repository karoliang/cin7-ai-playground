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
  Banner
} from '@shopify/polaris'
import { ExportIcon, ArrowDownIcon } from '@shopify/polaris-icons'
import { Project } from '@/types'
import { exportService, ExportProgress } from '@/services/exportService'
import { ExportOptions } from '@/lib/projectPackager'
import { ActionModal } from '@/components/ui/PolarisComponents'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  project: Project
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onClose, project }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    exportService.getDefaultExportOptions()
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportId, setExportId] = useState<string>('')
  const [exportResult, setExportResult] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (open && project) {
      const info = exportService.getExportInfo(project, exportOptions)
      console.log('Export info:', info)
    }
  }, [open, project, exportOptions])

  const handleExport = async () => {
    if (!project) return

    setIsExporting(true)
    setExportResult(null)

    const newExportId = Date.now().toString()
    setExportId(newExportId)

    // Add progress callback
    exportService.addProgressCallback(newExportId, (progress: ExportProgress) => {
      setExportProgress(progress)
    })

    try {
      const result = await exportService.exportProject(project, exportOptions, newExportId)
      setExportResult(result)

      if (result.success && result.blob) {
        // Auto-download the file
        exportService.downloadFile(result.blob, result.filename || 'export.zip')
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setTimeout(() => {
        setExportProgress(null)
      }, 2000)
    }
  }

  const handlePreview = async () => {
    if (!project) return

    try {
      const preview = await exportService.previewExport(project, exportOptions)
      console.log('Export preview:', preview)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const exportInfo = project ? exportService.getExportInfo(project, exportOptions) : null

  const formatOptions = [
    { label: 'ZIP Archive (Recommended)', value: 'zip' },
    { label: 'GitHub Repository', value: 'github' },
    { label: 'Docker Container', value: 'docker' }
  ]

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Export "${project?.name || 'Project'}"`}
        size="large"
        primaryAction={
          exportResult?.success
            ? undefined
            : {
                content: isExporting ? 'Exporting...' : 'Export Project',
                onAction: handleExport,
                loading: isExporting,
                disabled: !project || isExporting,
                icon: ExportIcon
              }
        }
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: onClose,
            disabled: isExporting
          },
          {
            content: 'Preview',
            onAction: handlePreview,
            disabled: isExporting || !project
          }
        ]}
      >
        <Modal.Section>
          {exportResult?.success ? (
            <Card>
              <BlockStack gap="400">
                <Banner tone="success" title="Export Successful!">
                  <Text as="p">
                    Your project has been exported successfully. The download should have started automatically.
                  </Text>
                </Banner>

                {exportResult.size && (
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm">
                      File size: {formatFileSize(exportResult.size)}
                    </Text>
                    <Text as="p" variant="bodySm">
                      File name: {exportResult.filename}
                    </Text>
                  </BlockStack>
                )}

                <InlineStack gap="200">
                  <Button
                    icon={ArrowDownIcon}
                    onClick={() => {
                      if (exportResult.blob) {
                        exportService.downloadFile(
                          exportResult.blob,
                          exportResult.filename || 'export.zip'
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
                  </BlockStack>
                </Card>
              )}

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

              {exportInfo && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">Project Information</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Framework:</Text>
                      <Badge>{exportInfo.framework}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Build Tool:</Text>
                      <Text as="span" variant="bodySm">{exportInfo.buildTool}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Files:</Text>
                      <Text as="span" variant="bodySm">{exportInfo.fileCount}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodySm">Estimated Size:</Text>
                      <Text as="span" variant="bodySm">{formatFileSize(exportInfo.estimatedSize)}</Text>
                    </InlineStack>
                    {exportInfo.dependencies.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="span" variant="bodySm">Main Dependencies:</Text>
                        <InlineStack gap="200">
                          {exportInfo.dependencies.map((dep, index) => (
                            <Badge key={index}>{dep}</Badge>
                          ))}
                        </InlineStack>
                      </BlockStack>
                    )}
                  </BlockStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>

      {/* Preview Modal */}
      <ActionModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Export Preview"
        primaryAction={{
          content: 'Close',
          onAction: () => setShowPreview(false)
        }}
      >
        <Text as="p">
          Preview functionality will show the package.json structure and file organization
          before export. This helps you verify what will be included in the export.
        </Text>
      </ActionModal>
    </>
  )
}