import React, { useState, useCallback } from 'react'
import {
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
  Scrollable
} from '@shopify/polaris'
import {
  EditIcon,
  CodeIcon,
  ViewIcon
} from '@shopify/polaris-icons'
import { ProjectFile, FileType } from '@/types'

interface FilePreviewSnippetProps {
  file: ProjectFile
  onEdit: (fileId: string) => void
}

export const FilePreviewSnippet: React.FC<FilePreviewSnippetProps> = ({
  file,
  onEdit
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Generate preview content based on file type
  const generatePreview = useCallback((content: string, type: FileType): string => {
    if (!content || content.trim() === '') {
      return `Empty ${type} file`
    }

    const lines = content.split('\n')
    const previewLines = []
    const maxLines = 5
    const maxCharsPerLine = 80

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      let line = lines[i]

      // Truncate long lines
      if (line.length > maxCharsPerLine) {
        line = line.substring(0, maxCharsPerLine) + '...'
      }

      previewLines.push(line)
    }

    // Add ellipsis if there are more lines
    if (lines.length > maxLines) {
      previewLines.push('...')
    }

    return previewLines.join('\n')
  }, [])

  // Get syntax highlighting class based on file type
  const getSyntaxClass = useCallback((type: FileType): string => {
    const syntaxMap: Record<FileType, string> = {
      javascript: 'language-javascript',
      typescript: 'language-typescript',
      jsx: 'language-javascript',
      tsx: 'language-typescript',
      css: 'language-css',
      html: 'language-html',
      json: 'language-json',
      md: 'language-markdown',
      txt: 'language-plain',
      image: 'language-plain',
      other: 'language-plain'
    }
    return syntaxMap[type] || 'language-plain'
  }, [])

  // Get file type display name with color
  const getFileTypeDisplay = useCallback((type: FileType) => {
    const typeConfig = {
      javascript: { label: 'JavaScript', color: 'fyellow' as const },
      typescript: { label: 'TypeScript', color: 'fblue' as const },
      jsx: { label: 'React JSX', color: 'fcyan' as const },
      tsx: { label: 'React TSX', color: 'fblue' as const },
      css: { label: 'CSS', color: 'fpurple' as const },
      html: { label: 'HTML', color: 'forange' as const },
      json: { label: 'JSON', color: 'fgreen' as const },
      md: { label: 'Markdown', color: 'fgrey' as const },
      txt: { label: 'Text', color: 'fgrey' as const },
      image: { label: 'Image', color: 'fpink' as const },
      other: { label: 'Other', color: 'fgrey' as const }
    }
    return typeConfig[type] || typeConfig.other
  }, [])

  // Calculate file statistics
  const getFileStats = useCallback((content: string) => {
    const lines = content.split('\n').length
    const chars = content.length
    const words = content.trim() ? content.trim().split(/\s+/).length : 0

    return { lines, chars, words }
  }, [])

  const preview = generatePreview(file.content, file.type)
  const stats = getFileStats(file.content)
  const typeDisplay = getFileTypeDisplay(file.type)

  const handleEdit = () => {
    onEdit(file.id)
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleEdit}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: isHovered ? '1px solid var(--p-color-border-interactive)' : '1px solid var(--p-color-border)',
        backgroundColor: isHovered ? 'var(--p-color-bg-surface-hover)' : 'var(--p-color-bg-surface-subdued)',
        borderRadius: '0.5rem',
        padding: '1rem'
      }}
    >
      <BlockStack gap="200">
        {/* Header with file info */}
        <InlineStack align="space-between">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={CodeIcon} />
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {file.name}
            </Text>
            <Badge size="small">
              {typeDisplay.label}
            </Badge>
          </InlineStack>
          <Button
            icon={EditIcon}
            size="slim"
            variant="plain"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit()
            }}
          />
        </InlineStack>

        {/* File metadata */}
        <InlineStack gap="400">
          <Text as="span" variant="bodyXs">
            {stats.lines} lines
          </Text>
          <Text as="span" variant="bodyXs">
            {stats.chars} chars
          </Text>
          {file.type !== 'image' && (
            <Text as="span" variant="bodyXs">
              {stats.words} words
            </Text>
          )}
        </InlineStack>

        {/* Preview content */}
        {file.type === 'image' ? (
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--p-color-bg-surface)',
            borderRadius: '0.25rem',
            textAlign: 'center',
            border: '1px dashed var(--p-color-border)'
          }}>
            <Icon source={ViewIcon} />
            <Text as="p" variant="bodySm">
              Image file - Click to view
            </Text>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--p-color-bg-surface)',
              borderRadius: '0.25rem',
              padding: '0.75rem',
              border: '1px solid var(--p-color-border)',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '0.75rem',
              lineHeight: '1.4',
              color: 'var(--p-color-text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflow: 'hidden',
              position: 'relative'
            }}
            className={getSyntaxClass(file.type)}
          >
            <Scrollable shadow={false} style={{ maxHeight: '100px' }}>
              <Text variant="bodyXs" as="span">
                {preview}
              </Text>
            </Scrollable>

            {/* Gradient overlay for better text truncation */}
            {stats.lines > 5 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '20px',
                  background: 'linear-gradient(transparent, var(--p-color-bg-surface))',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        )}

        {/* Action hint */}
        <Text as="p" variant="bodyXs" alignment="center">
          {isHovered ? 'Click to edit in code editor' : 'Hover to preview'}
        </Text>
      </BlockStack>
    </div>
  )
}