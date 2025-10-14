import { Project } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function saveProjectToDB(project: Project): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: project.id ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': project.id ? `return=minimal` : 'return=minimal'
      },
      body: JSON.stringify({
        id: project.id,
        user_id: project.user_id,
        name: project.name,
        description: project.description,
        prompt: project.prompt,
        files: project.files,
        messages: project.messages,
        chat_history: project.messages, // For compatibility
        metadata: project.metadata,
        settings: project.settings,
        status: project.status,
        updated_at: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to save project')
    }

  } catch (error) {
    console.error('Save project error:', error)
    throw error
  }
}

export async function loadProjectFromDB(projectId: string): Promise<Project | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to load project: ${response.status}`)
    }

    const projects = await response.json()

    if (projects.length === 0) {
      return null
    }

    const projectData = projects[0]

    // Transform to match our Project type
    const project: Project = {
      id: projectData.id,
      user_id: projectData.user_id,
      name: projectData.name,
      description: projectData.description,
      prompt: projectData.prompt,
      files: projectData.files || [],
      messages: projectData.messages || projectData.chat_history || [],
      metadata: projectData.metadata || {},
      settings: projectData.settings || {},
      status: projectData.status || 'draft',
      created_at: projectData.created_at,
      updated_at: projectData.updated_at
    }

    return project

  } catch (error) {
    console.error('Load project error:', error)
    throw error
  }
}

export async function deleteProjectFromDB(projectId: string): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.status}`)
    }

  } catch (error) {
    console.error('Delete project error:', error)
    throw error
  }
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&select=*&order=updated_at.desc`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to load projects: ${response.status}`)
    }

    const projectsData = await response.json()

    return projectsData.map((projectData: any) => ({
      id: projectData.id,
      user_id: projectData.user_id,
      name: projectData.name,
      description: projectData.description,
      prompt: projectData.prompt,
      files: projectData.files || [],
      messages: projectData.messages || projectData.chat_history || [],
      metadata: projectData.metadata || {},
      settings: projectData.settings || {},
      status: projectData.status || 'draft',
      created_at: projectData.created_at,
      updated_at: projectData.updated_at
    }))

  } catch (error) {
    console.error('Get user projects error:', error)
    return []
  }
}