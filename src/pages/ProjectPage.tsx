import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Page, Layout, Card, Text, SkeletonPage } from '@shopify/polaris'
import { useProjectStore } from '@/stores/projectStore'
import { ProjectWorkspace } from '@/components/project/ProjectWorkspace'

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams()
  const { currentProject, loadProject, isLoading, error } = useProjectStore()

  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId, loadProject])

  if (isLoading) {
    return (
      <SkeletonPage
        primaryAction
        title="Loading Project..."
        breadcrumbs={[{ content: 'Dashboard', url: '/' }]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Text>Loading your project...</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    )
  }

  if (error) {
    return (
      <Page
        title="Error"
        breadcrumbs={[{ content: 'Dashboard', url: '/' }]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2" tone="critical">
                Failed to load project
              </Text>
              <Text>{error}</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  if (!currentProject) {
    return (
      <Page
        title="Project Not Found"
        breadcrumbs={[{ content: 'Dashboard', url: '/' }]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Project not found
              </Text>
              <Text>The project you're looking for doesn't exist or you don't have access to it.</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    )
  }

  return (
    <Page
      title={currentProject.name}
      breadcrumbs={[{ content: 'Dashboard', url: '/' }]}
      subtitle={currentProject.description}
    >
      <ProjectWorkspace />
    </Page>
  )
}

export default ProjectPage