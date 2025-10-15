import React, { useCallback, useRef, useEffect } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { ProjectFile, FileType } from '@/types'

interface CodeMirrorEditorProps {
  value: string
  height?: string
  theme?: 'light' | 'dark'
  language?: FileType
  onChange: (value: string) => void
  basicSetup?: boolean
  extensions?: any[]
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  height = '400px',
  theme = 'light',
  language,
  onChange,
  basicSetup: enableBasicSetup = true,
  extensions: customExtensions = []
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Get language extension
  const getLanguageExtension = useCallback(() => {
    if (!language) return null

    switch (language) {
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
  }, [language])

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return

    // Cleanup previous editor
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    // Create extensions array
    const extensions: any[] = []

    // Add basic setup if enabled
    if (enableBasicSetup) {
      extensions.push(basicSetup)
    }

    // Add language extension
    const langExt = getLanguageExtension()
    if (langExt) {
      extensions.push(langExt)
    }

    // Add theme
    if (theme === 'dark') {
      extensions.push(oneDark)
    }

    // Add custom extensions
    extensions.push(...customExtensions)

    // Add change listener
    extensions.push(
      EditorView.updateListener.of((update: any) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          onChange(newValue)
        }
      })
    )

    // Create editor state
    const state = EditorState.create({
      doc: value,
      extensions
    })

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [theme, language, getLanguageExtension, enableBasicSetup, customExtensions])

  // Update editor content when value prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      })
    }
  }, [value])

  return (
    <div
      ref={editorRef}
      style={{
        height,
        border: '1px solid var(--p-color-border)',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
      className="codemirror-editor"
    />
  )
}

export default CodeMirrorEditor