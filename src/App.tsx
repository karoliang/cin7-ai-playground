import { Routes, Route } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { ProjectPage } from '@/pages/ProjectPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CodeGeneratorPage } from '@/pages/CodeGeneratorPage'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { ContextualUpdateProvider } from '@/components/context/ContextualUpdateSystem'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

function App() {
  const { initialize, user } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ErrorBoundary>
      <ContextualUpdateProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:projectId" element={<ProjectPage />} />
            <Route path="/project" element={<ProjectPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/code-generator" element={<CodeGeneratorPage />} />
          </Routes>
        </Layout>
      </ContextualUpdateProvider>
    </ErrorBoundary>
  )
}

export { App }