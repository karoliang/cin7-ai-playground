import React, { useState, useCallback } from 'react'
import {
  Modal,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Card,
  Banner,
  TextContainer
} from '@shopify/polaris'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
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

  // Get language extension for CodeMirror
  const getLanguageExtension = useCallback(() => {
    if (!file) return null

    switch (file.type) {
      case 'javascript':
      case 'jsx':
      case 'typescript':
      case 'tsx':
        return javascript({ jsx: true, typescript: true })
      case 'css':
        return css()
      case 'html':
        return html()
      case 'json':
        return json()
      default:
        return null
    }
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
                <Text as="span" tone="subdued">Type:</Text>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  {getFileTypeDisplayName(file.type)}
                </Text>
              </InlineStack>
              <InlineStack gap="400">
                <Text as="span" tone="subdued">Size:</Text>
                <Text variant="bodySm">{content.length} characters</Text>
              </InlineStack>
              <InlineStack gap="400">
                <Text as="span" tone="subdued">Language:</Text>
                <Text variant="bodySm">{file.language || file.type}</Text>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Validation Error */}
          {!isValid && validationError && (
            <Banner status="critical">
              <TextContainer>
                <Text variant="bodySm">{validationError}</Text>
              </TextContainer>
            </Banner>
          )}

          {/* Code Editor */}
          <div style={{
            border: '1px solid var(--p-color-border)',
            borderRadius: '0.5rem',
            overflow: 'hidden'
          }}>
            <CodeMirror
              value={content}
              height="400px"
              theme={resolvedTheme === 'dark' ? oneDark : undefined}
              extensions={[getLanguageExtension()].filter(Boolean)}
              onChange={handleContentChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: true
              }}
            />
          </div>

          {/* Editor Tips */}
          <Card>
            <Text as="span" tone="subdued">
              <strong>Tips:</strong> Use Ctrl+S (Cmd+S on Mac) to save, Ctrl+Z to undo, and Ctrl+Y to redo.
              The editor supports syntax highlighting and basic validation for {getFileTypeDisplayName(file.type)} files.
            </Text>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  )
}