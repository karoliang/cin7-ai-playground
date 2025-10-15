import React, { useCallback, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { ProjectFile, FileType } from '@/types'

interface MonacoEditorProps {
  value: string
  height?: string
  theme?: 'light' | 'dark'
  language?: FileType
  onChange: (value: string) => void
  basicSetup?: boolean
  extensions?: any[]
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  height = '400px',
  theme = 'light',
  language,
  onChange,
  basicSetup: enableBasicSetup = true,
  extensions: customExtensions = []
}) => {
  const editorRef = useRef<any>(null)

  // Get Monaco language from file type
  const getMonacoLanguage = useCallback((fileType: FileType): string => {
    switch (fileType) {
      case 'javascript':
      case 'jsx':
        return 'javascript'
      case 'typescript':
      case 'tsx':
        return 'typescript'
      case 'css':
        return 'css'
      case 'html':
        return 'html'
      case 'json':
        return 'json'
      case 'md':
        return 'markdown'
      default:
        return 'plaintext'
    }
  }, [])

  // Get Monaco theme
  const getMonacoTheme = useCallback((themeValue: 'light' | 'dark'): string => {
    return themeValue === 'dark' ? 'vs-dark' : 'vs-light'
  }, [])

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: true,
      automaticLayout: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: {
        indentation: true,
        bracketPairs: true
      }
    })

    // Add custom keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save functionality will be handled by parent component
      const saveEvent = new CustomEvent('editor-save')
      window.dispatchEvent(saveEvent)
    })

    // Add change listener
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue()
      onChange(newValue)
    })

    // Add basic validation for JavaScript/TypeScript
    if (language && ['javascript', 'typescript', 'jsx', 'tsx'].includes(language)) {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })
    }
  }, [language, onChange])

  // Handle editor change
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onChange(value)
    }
  }, [onChange])

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      const model = editorRef.current.getModel()
      if (model) {
        model.setValue(value)
      }
    }
  }, [value])

  return (
    <div
      style={{
        height,
        border: '1px solid var(--p-color-border)',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
      className="monaco-editor"
    >
      <Editor
        height="100%"
        language={language ? getMonacoLanguage(language) : 'plaintext'}
        theme={getMonacoTheme(theme)}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: true,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          guides: {
            indentation: true,
            bracketPairs: true
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          }
        }}
        loading={<div style={{ padding: '20px', textAlign: 'center' }}>Loading editor...</div>}
      />
    </div>
  )
}

export default MonacoEditor