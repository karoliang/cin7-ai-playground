import React, { useState, useCallback } from 'react'
import {
  Card,
  Text,
  TextField,
  Button,
  Select,
  BlockStack,
  InlineStack,
  Badge,
  Layout,
  Page,
  Divider,
  Thumbnail,
  Icon,
  Spinner,
  Banner,
  Tabs
} from '@shopify/polaris'
import {
  CodeIcon,
  ExportIcon,
  ImportIcon,
  MobileIcon,
  DesktopIcon,
  HomeIcon,
  ChartLineIcon,
  SettingsIcon,
  PlusCircleIcon
} from '@shopify/polaris-icons'
import { generateCodeWithAI } from '@/services/aiService'
import { useNotifications } from '@/utils/notifications'
import { GenerateRequest, GenerateResponse, SupportedFramework, ProjectTemplate, ProjectArchitecture } from '@/types'

type CodeGenerationType = 'component' | 'page' | 'full-app' | 'api' | 'utility'
type ComplexityLevel = 'simple' | 'intermediate' | 'complex'

interface GenerationPreset {
  id: string
  name: string
  description: string
  type: CodeGenerationType
  framework: SupportedFramework
  complexity: ComplexityLevel
  icon: React.ComponentType<any>
  template?: ProjectTemplate
}

const generationPresets: GenerationPreset[] = [
  {
    id: 'react-component',
    name: 'React Component',
    description: 'Generate a reusable React component with TypeScript',
    type: 'component',
    framework: 'react',
    complexity: 'simple',
    icon: CodeIcon
  },
  {
    id: 'react-page',
    name: 'React Page',
    description: 'Create a complete page with layout and components',
    type: 'page',
    framework: 'react',
    complexity: 'intermediate',
    icon: HomeIcon
  },
  {
    id: 'dashboard',
    name: 'Dashboard App',
    description: 'Full dashboard application with analytics',
    type: 'full-app',
    framework: 'react',
    complexity: 'complex',
    icon: ChartLineIcon,
    template: 'dashboard'
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Mobile-optimized application with responsive design',
    type: 'full-app',
    framework: 'react',
    complexity: 'complex',
    icon: MobileIcon,
    template: 'mobile-commerce'
  },
  {
    id: 'vanilla-js',
    name: 'Vanilla JavaScript',
    description: 'Plain JavaScript code without frameworks',
    type: 'component',
    framework: 'vanilla',
    complexity: 'simple',
    icon: CodeIcon
  },
  {
    id: 'api-endpoint',
    name: 'API Endpoint',
    description: 'RESTful API endpoint with validation',
    type: 'api',
    framework: 'vanilla',
    complexity: 'intermediate',
    icon: SettingsIcon
  }
]

const frameworkOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vanilla JavaScript', value: 'vanilla' },
  { label: 'Vue.js', value: 'vue' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'CSS Module', value: 'css' }
]

const complexityOptions = [
  { label: 'Simple', value: 'simple' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Complex', value: 'complex' }
]

export const CodeGeneratorPage: React.FC = () => {
  const { showNotification, NotificationComponent } = useNotifications()

  // Form state
  const [prompt, setPrompt] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [framework, setFramework] = useState<SupportedFramework>('react')
  const [complexity, setComplexity] = useState<ComplexityLevel>('intermediate')
  const [includeTests, setIncludeTests] = useState(true)
  const [includeDocs, setIncludeDocs] = useState(true)
  const [selectedTab, setSelectedTab] = useState(0)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = generationPresets.find(p => p.id === presetId)
    if (preset) {
      setSelectedPreset(presetId)
      setFramework(preset.framework)
      setComplexity(preset.complexity)
      setPrompt(preset.description)
    }
  }, [])

  const handleFrameworkChange = useCallback((selected: string) => {
    setFramework(selected as SupportedFramework)
  }, [])

  const handleComplexityChange = useCallback((selected: string) => {
    setComplexity(selected as ComplexityLevel)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of what you want to generate')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationResult(null)

    try {
      const request: GenerateRequest = {
        prompt: prompt.trim(),
        context: {
          framework,
          template: selectedPreset ? generationPresets.find(p => p.id === selectedPreset)?.template : undefined,
          constraints: complexity === 'simple' ? ['keep it simple', 'minimal dependencies'] :
                     complexity === 'complex' ? ['comprehensive', 'production-ready', 'scalable'] :
                     ['balanced approach'],
          examples: []
        },
        options: {
          include_tests: includeTests,
          include_docs: includeDocs,
          temperature: complexity === 'simple' ? 0.3 : complexity === 'complex' ? 0.8 : 0.5,
          max_tokens: complexity === 'simple' ? 1000 : complexity === 'complex' ? 4000 : 2000
        }
      }

      const response = await generateCodeWithAI(request)

      if (response.success) {
        setGenerationResult(response)
        showNotification(
          `Code Generated Successfully! Generated ${response.files.length} file(s) with confidence ${response.confidence}%`,
          'success'
        )
      } else {
        setError(response.error || 'Failed to generate code')
        showNotification(
          `Generation Failed: ${response.error || 'Failed to generate code'}`,
          'error'
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      showNotification(`Error: ${errorMessage}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, framework, complexity, includeTests, includeDocs, selectedPreset, showNotification])

  const handleReset = useCallback(() => {
    setPrompt('')
    setSelectedPreset('')
    setFramework('react')
    setComplexity('intermediate')
    setIncludeTests(true)
    setIncludeDocs(true)
    setGenerationResult(null)
    setError(null)
  }, [])

  const tabs = [
    {
      id: 'preset',
      content: 'Quick Start',
      panelID: 'preset-panel'
    },
    {
      id: 'custom',
      content: 'Custom Generation',
      panelID: 'custom-panel'
    },
    {
      id: 'results',
      content: 'Results',
      panelID: 'results-panel',
      badge: generationResult?.files?.length?.toString() || '0'
    }
  ]

  const renderPresetPanel = () => (
    <Layout>
      <Layout.Section>
        <Text variant="headingMd" as="h2">Choose a Template</Text>
        <Text variant="bodyMd" as="p">
          Select a preset to quickly get started with common code generation patterns.
        </Text>
      </Layout.Section>

      <Layout.Section>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {generationPresets.map((preset) => (
            <Card key={preset.id}>
              <BlockStack gap="400">
                <InlineStack gap="400" blockAlign="center">
                  <Icon source={preset.icon as any} />
                  <Text variant="headingSm" as="h3">{preset.name}</Text>
                </InlineStack>
                <Text variant="bodySm" as="span">{preset.description}</Text>
                <InlineStack gap="400">
                  <Badge tone="info">{preset.framework}</Badge>
                  <Badge tone={preset.complexity === 'simple' ? 'success' : preset.complexity === 'complex' ? 'attention' : 'info'}>
                    {preset.complexity}
                  </Badge>
                  <Badge>{preset.type}</Badge>
                </InlineStack>
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    size="slim"
                    onClick={() => handlePresetSelect(preset.id)}
                  >
                    Use This Template
                  </Button>
                </div>
              </BlockStack>
            </Card>
          ))}
        </div>
      </Layout.Section>
    </Layout>
  )

  const renderCustomPanel = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <Text variant="headingMd" as="h2">Configuration</Text>
          <div style={{ marginTop: '1rem' }}>
            <BlockStack gap="800">
              <Select
                label="Framework"
                options={frameworkOptions}
                value={framework}
                onChange={handleFrameworkChange}
              />

              <Select
                label="Complexity"
                options={complexityOptions}
                value={complexity}
                onChange={handleComplexityChange}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={includeTests}
                    onChange={(e) => setIncludeTests(e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Include unit tests
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={includeDocs}
                    onChange={(e) => setIncludeDocs(e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Include documentation
                </label>
              </div>
            </BlockStack>
          </div>
        </Card>
      </Layout.Section>

      <Layout.Section>
        <Card>
          <Text variant="headingMd" as="h2">Describe What You Want to Generate</Text>
          <div style={{ marginTop: '1rem' }}>
            <TextField
              label="Description"
              value={prompt}
              onChange={setPrompt}
              multiline={4}
              placeholder="Describe the code you want to generate. Be as specific as possible about functionality, styling, and any requirements..."
              error={error}
              autoComplete="off"
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <InlineStack align="end">
              <Button onClick={handleReset}>Reset</Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                loading={isGenerating}
                disabled={!prompt.trim() || isGenerating}
                icon={isGenerating ? undefined : CodeIcon}
              >
                {isGenerating ? 'Generating...' : 'Generate Code'}
              </Button>
            </InlineStack>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  const renderResultsPanel = () => {
    if (!generationResult) {
      return (
        <Layout>
          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">No Results Yet</Text>
              <Text variant="bodyMd" as="p">
                Generate some code first to see the results here.
              </Text>
            </Card>
          </Layout.Section>
        </Layout>
      )
    }

    return (
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Generation Summary</Text>
            <div style={{ marginTop: '1rem' }}>
              <BlockStack gap="400">
                <div>
                  <Text variant="bodySm" as="span">Status</Text>
                  <Badge tone={generationResult.success ? 'success' : 'critical'}>
                    {generationResult.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>

                <div>
                  <Text variant="bodySm" as="span">Files Generated</Text>
                  <Text variant="bodyMd" as="p">{generationResult.files.length}</Text>
                </div>

                <div>
                  <Text variant="bodySm" as="span">Confidence</Text>
                  <Text variant="bodyMd" as="p">{generationResult.confidence}%</Text>
                </div>

                {generationResult.reasoning && (
                  <div>
                    <Text variant="bodySm" as="span">AI Reasoning</Text>
                    <Text variant="bodySm" as="p">{generationResult.reasoning}</Text>
                  </div>
                )}

                {generationResult.warnings && generationResult.warnings.length > 0 && (
                  <Banner tone="warning">
                    <Text variant="bodySm" as="p">{generationResult.warnings.join(', ')}</Text>
                  </Banner>
                )}
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Generated Files</Text>
            <div style={{ marginTop: '1rem' }}>
              <BlockStack gap="800">
                {generationResult.files.map((file, index) => (
                  <Card key={index}>
                    <BlockStack gap="400">
                      <InlineStack gap="400" blockAlign="center">
                        <Icon source={CodeIcon} />
                        <Text variant="headingSm" as="h3">{file.name}</Text>
                        <Badge tone="info">{file.type}</Badge>
                      </InlineStack>

                      {file.path && (
                        <Text variant="bodySm" as="span">Path: {file.path}</Text>
                      )}

                      <div style={{
                        backgroundColor: 'var(--p-color-bg-surface-subdued)',
                        padding: '1rem',
                        borderRadius: '4px',
                        maxHeight: '300px',
                        overflow: 'auto'
                      }}>
                        <pre style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {file.content}
                        </pre>
                      </div>

                      <InlineStack align="end">
                        <Button
                          size="slim"
                          icon={ExportIcon}
                          onClick={() => {
                            navigator.clipboard.writeText(file.content)
                            showNotification('Code copied to clipboard', 'success')
                          }}
                        >
                          Copy Code
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    )
  }

  return (
    <Page
      title="AI Code Generator"
      subtitle="Generate code, components, and full applications with AI"
    >
      <>{NotificationComponent}</>

      <Card>
        <Tabs
          tabs={tabs}
          selected={selectedTab}
          onSelect={setSelectedTab}
        >
          <div style={{ marginTop: '2rem' }}>
            {selectedTab === 0 && renderPresetPanel()}
            {selectedTab === 1 && renderCustomPanel()}
            {selectedTab === 2 && renderResultsPanel()}
          </div>
        </Tabs>
      </Card>
    </Page>
  )
}

export default CodeGeneratorPage