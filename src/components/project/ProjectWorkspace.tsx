import React from 'react'
import { Layout, Card, Text } from '@shopify/polaris'
import { useProjectStore } from '@/stores/projectStore'

export const ProjectWorkspace: React.FC = () => {
  const { currentProject, files, activeFile, messages, isGenerating } = useProjectStore()

  return (
    <Layout>
      <Layout.Section oneThird>
        {/* Chat Interface - Will be implemented */}
        <Card title="AI Assistant" sectioned>
          <Text>Chat interface coming soon...</Text>
        </Card>
      </Layout.Section>

      <Layout.Section oneThird>
        {/* Code Editor - Will be implemented */}
        <Card title="Code Editor" sectioned>
          <Text>
            {activeFile ? `Editing: ${activeFile.name}` : 'No file selected'}
          </Text>
          {files.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <Text variant="bodySm" color="subdued">
                Files: {files.map(f => f.name).join(', ')}
              </Text>
            </div>
          )}
        </Card>
      </Layout.Section>

      <Layout.Section oneThird>
        {/* Preview - Will be implemented */}
        <Card title="Preview" sectioned>
          <Text>Live preview coming soon...</Text>
          {isGenerating && (
            <div style={{ marginTop: '1rem' }}>
              <Text color="primary">Generating code...</Text>
            </div>
          )}
        </Card>
      </Layout.Section>
    </Layout>
  )
}