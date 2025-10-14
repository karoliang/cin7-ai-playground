import { Routes, Route } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { ProjectPage } from '@/pages/ProjectPage'
import { Layout } from '@/components/layout/Layout'
import { ContextualUpdateProvider } from '@/components/context/ContextualUpdateSystem'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

function App() {
  const { initialize, user } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <ContextualUpdateProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
          <Route path="/project" element={<ProjectPage />} />
        </Routes>
      </Layout>
    </ContextualUpdateProvider>
  )
}

export { App }