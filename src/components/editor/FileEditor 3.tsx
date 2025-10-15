import React, { useState, useCallback } from 'react'
import {
  Modal,
  Text,
  Button,
  ButtonGroup,
  BlockStack,
  Card,
  InlineStack,
  Banner,
  TextContainer
} from '@shopify/polaris'
import { MonacoEditor } from './MonacoEditor'
import { useTheme } from '@/components/ui/ThemeProvider'
import { ProjectFile, FileType } from '@/types'

// Type extension for CodeMirror
declare global {
  interface Window {
    Function: typeof Function
  }
}

interface FileEditorProps {
  file: ProjectFile | null
  isOpen: boolean
  onClose: () => void
  onSave: (content: string) => void
}

export const FileEditor: React.FC<FileEditorProps> = ({
  file,
  isOpen,
  onClose,
  onSave
}) => {
  const { resolvedTheme } = useTheme()
  const [content, setContent] = useState(file?.content || '')
  const [isValid, setIsValid] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      // Save shortcut (Ctrl+S or Cmd+S)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (isValid) {
          handleSave()
        }
      }

      // Escape to close
      if (event.key === 'Escape') {
        handleCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isValid, content, file, onSave, onClose])

  // Update content when file changes
  React.useEffect(() => {
    setContent(file?.content || '')
    setValidationError(null)
    setIsValid(true)
  }, [file])

  
  // Validate file content based on type
  const validateContent = useCallback((value: string) => {
    if (!file) return true

    try {
      switch (file.type) {
        case 'json':
          JSON.parse(value)
          setValidationError(null)
          return true
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
          // Basic syntax validation for JS/TS
          if (value.trim()) {
            // Check for basic syntax errors
            new Function(value)
            setValidationError(null)
          }
          return true
        case 'html':
          // Basic HTML validation
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = value
          setValidationError(null)
          return true
        case 'css':
          // Basic CSS validation
          if (value.trim() && !value.endsWith(';') && !value.includes('{')) {
            setValidationError('Invalid CSS syntax')
            return false
          }
          setValidationError(null)
          return true
        default:
          setValidationError(null)
          return true
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Invalid syntax')
      return false
    }
  }, [file])

  // Handle content change
  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    const valid = validateContent(value)
    setIsValid(valid)
  }, [validateContent])

  // Handle save
  const handleSave = useCallback(() => {
    if (!file || !isValid) return

    onSave(content)
    onClose()
  }, [file, content, isValid, onSave, onClose])

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (content !== file?.content) {
      // Optional: Add confirmation dialog here
      setContent(file?.content || '')
    }
    onClose()
  }, [content, file, onClose])

  // Get file type display name
  const getFileTypeDisplayName = (type: FileType): string => {
    const typeMap: Record<FileType, string> = {
      html: 'HTML',
      css: 'CSS',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      jsx: 'React JSX',
      tsx: 'React TSX',
      json: 'JSON',
      md: 'Markdown',
      txt: 'Text',
      image: 'Image',
      other: 'Other'
    }
    return typeMap[type] || 'Unknown'
  }

  if (!file) return null

  return (
    <Modal
      open={isOpen}
      onClose={handleCancel}
      title={`Editing: ${file.name}`}
      size="large"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        disabled: !isValid
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleCancel
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* File Info */}
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="400">
                <Text as="span" variant="bodySm">Type:</Text>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  {getFileTypeDisplayName(file.type)}
                </Text>
              </InlineStack>
              <InlineStack gap="400">
                <Text as="span" variant="bodySm">Size:</Text>
                <Text as="span" variant="bodySm">{content.length} characters</Text>
              </InlineStack>
              <InlineStack gap="400">
                <Text as="span" variant="bodySm">Language:</Text>
                <Text as="span" variant="bodySm">{file.language || file.type}</Text>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Validation Error */}
          {!isValid && validationError && (
            <Banner tone="critical">
              <TextContainer>
                <Text as="p" variant="bodySm">{validationError}</Text>
              </TextContainer>
            </Banner>
          )}

          {/* Code Editor */}
          <MonacoEditor
            value={content}
            height="400px"
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            language={file.type}
            onChange={handleContentChange}
          />

          {/* Editor Tips */}
          <Card>
            <Text as="p" variant="bodySm">
              <strong>Tips:</strong> Use Ctrl+S (Cmd+S on Mac) to save, Ctrl+Z to undo, and Ctrl+Y to redo.
              The editor supports syntax highlighting and basic validation for {getFileTypeDisplayName(file.type)} files.
            </Text>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}