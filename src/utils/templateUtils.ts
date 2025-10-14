import { TemplateService } from '@/services/templateService'
import { Project, ProjectTemplate } from '@/types'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'

export async function createProjectFromTemplate(
  templateType: ProjectTemplate,
  customizations?: {
    name?: string
    description?: string
    theme?: string
  }
): Promise<string> {
  try {
    const { user } = useAuthStore.getState()

    if (!user) {
      throw new Error('User must be authenticated to create projects')
    }

    const templateService = TemplateService.getInstance()
    const project = await templateService.generateProjectFromTemplate(
      templateType,
      user.id,
      customizations
    )

    // Save the project to the database
    const { saveProjectToDB } = await import('@/services/projectService')
    await saveProjectToDB(project)

    return project.id
  } catch (error) {
    console.error('Failed to create project from template:', error)
    throw error
  }
}

export async function createAndNavigateToSalesDashboard(
  navigate: (path: string) => void,
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    // Show loading notification if available
    showNotification?.('Creating sales dashboard...', 'info')

    const projectId = await createProjectFromTemplate('cin7-sales', {
      name: 'Sales Dashboard',
      description: 'Interactive sales dashboard with revenue analytics, customer metrics, and product performance insights',
      theme: '#3b82f6'
    })

    // Update the project store with the new project
    const { loadProject } = useProjectStore.getState()
    await loadProject(projectId)

    // Show success notification
    showNotification?.('Sales dashboard created successfully!', 'success')

    // Navigate to the project
    navigate(`/project/${projectId}`)

  } catch (error) {
    console.error('Failed to create sales dashboard:', error)
    showNotification?.(
      error instanceof Error ? error.message : 'Failed to create sales dashboard',
      'error'
    )
  }
}

export async function createAndNavigateToInventoryDashboard(
  navigate: (path: string) => void,
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    showNotification?.('Creating inventory dashboard...', 'info')

    // For now, create a basic project. This can be extended with a proper inventory template
    const { createProject } = useProjectStore.getState()
    const projectId = await createProject('Create an inventory management dashboard with stock tracking, reorder points, and supplier management')

    showNotification?.('Inventory dashboard created successfully!', 'success')
    navigate(`/project/${projectId}`)

  } catch (error) {
    console.error('Failed to create inventory dashboard:', error)
    showNotification?.(
      error instanceof Error ? error.message : 'Failed to create inventory dashboard',
      'error'
    )
  }
}

export async function createAndNavigateToOrderManagement(
  navigate: (path: string) => void,
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    showNotification?.('Creating order management system...', 'info')

    const { createProject } = useProjectStore.getState()
    const projectId = await createProject('Create an order management system with order tracking, fulfillment workflows, and customer communication')

    showNotification?.('Order management system created successfully!', 'success')
    navigate(`/project/${projectId}`)

  } catch (error) {
    console.error('Failed to create order management system:', error)
    showNotification?.(
      error instanceof Error ? error.message : 'Failed to create order management system',
      'error'
    )
  }
}

export async function createAndNavigateToMultiPageApp(
  navigate: (path: string) => void,
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    showNotification?.('Creating multi-page application...', 'info')

    const projectId = await createProjectFromTemplate('multi-page-app', {
      name: 'Multi-Page Application',
      description: 'A professional multi-page application with modern design, responsive layout, and comprehensive features',
      theme: '#3b82f6'
    })

    // Update the project store with the new project
    const { loadProject } = useProjectStore.getState()
    await loadProject(projectId)

    // Show success notification
    showNotification?.('Multi-page application created successfully!', 'success')

    // Navigate to the project
    navigate(`/project/${projectId}`)

  } catch (error) {
    console.error('Failed to create multi-page application:', error)
    showNotification?.(
      error instanceof Error ? error.message : 'Failed to create multi-page application',
      'error'
    )
  }
}

export async function createAndNavigateToMobileCommerce(
  navigate: (path: string) => void,
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  try {
    showNotification?.('Creating mobile commerce application...', 'info')

    const projectId = await createProjectFromTemplate('mobile-commerce', {
      name: 'Mobile Commerce',
      description: 'A comprehensive mobile-first e-commerce application with product catalog, shopping cart, checkout, and user account features optimized for mobile devices',
      theme: '#FF6B35'
    })

    // Update the project store with the new project
    const { loadProject } = useProjectStore.getState()
    await loadProject(projectId)

    // Show success notification
    showNotification?.('Mobile commerce application created successfully!', 'success')

    // Navigate to the project
    navigate(`/project/${projectId}`)

  } catch (error) {
    console.error('Failed to create mobile commerce application:', error)
    showNotification?.(
      error instanceof Error ? error.message : 'Failed to create mobile commerce application',
      'error'
    )
  }
}