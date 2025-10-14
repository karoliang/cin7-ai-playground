import { User } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface AccountDeletionSummary {
  totalProjects: number
  totalFiles: number
  totalMessages: number
  projectNames: string[]
}

export async function getAccountDeletionSummary(userId: string): Promise<AccountDeletionSummary> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&select=id,name,files,messages`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get account summary: ${response.status}`)
    }

    const projects = await response.json()

    const totalProjects = projects.length
    const totalFiles = projects.reduce((acc: number, project: any) => acc + (project.files?.length || 0), 0)
    const totalMessages = projects.reduce((acc: number, project: any) => acc + (project.messages?.length || 0), 0)
    const projectNames = projects.map((project: any) => project.name).filter(Boolean)

    return {
      totalProjects,
      totalFiles,
      totalMessages,
      projectNames
    }
  } catch (error) {
    console.error('Get account deletion summary error:', error)
    throw error
  }
}

export async function deleteAllUserData(userId: string): Promise<void> {
  try {
    // Step 1: Get all user projects
    const projectsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    )

    if (!projectsResponse.ok) {
      throw new Error(`Failed to get user projects: ${projectsResponse.status}`)
    }

    const projects = await projectsResponse.json()

    // Step 2: Delete all projects in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (project: any) => {
          const deleteResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/projects?id=eq.${project.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              }
            }
          )

          if (!deleteResponse.ok) {
            console.warn(`Failed to delete project ${project.id}: ${deleteResponse.status}`)
          }
        })
      )
    }

    // Step 3: Attempt to delete any additional user-related data
    // This would need to be customized based on your database schema

    // Delete user profile data if stored in separate table
    try {
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      )

      if (!profileResponse.ok && profileResponse.status !== 404) {
        console.warn(`Failed to delete user profile: ${profileResponse.status}`)
      }
    } catch (error) {
      console.warn('User profile deletion failed:', error)
    }

    // Delete user preferences if stored in separate table
    try {
      const prefsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_preferences?user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      )

      if (!prefsResponse.ok && prefsResponse.status !== 404) {
        console.warn(`Failed to delete user preferences: ${prefsResponse.status}`)
      }
    } catch (error) {
      console.warn('User preferences deletion failed:', error)
    }

  } catch (error) {
    console.error('Delete all user data error:', error)
    throw error
  }
}

export async function verifyUserPassword(email: string, password: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return !error
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

export async function initiateAccountDeletion(user: User, password: string): Promise<void> {
  try {
    // Step 1: Verify password
    const isValidPassword = await verifyUserPassword(user.email, password)
    if (!isValidPassword) {
      throw new Error('Invalid password. Please enter your current password to confirm account deletion.')
    }

    // Step 2: Get deletion summary for logging/auditing
    const summary = await getAccountDeletionSummary(user.id)
    console.log(`Account deletion initiated for user ${user.id}:`, summary)

    // Step 3: Delete all user data
    await deleteAllUserData(user.id)

    // Step 4: Delete the user from authentication
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )

    // Try admin deletion first (requires service role key)
    try {
      const { error: adminDeleteError } = await supabase.auth.admin.deleteUser(user.id)

      if (adminDeleteError) {
        console.warn('Admin deletion failed, user will need to be deleted manually:', adminDeleteError)

        // Sign out the user and let background processes handle deletion
        await supabase.auth.signOut()
      }
    } catch (adminError) {
      console.warn('Admin deletion not available, signing out user:', adminError)
      await supabase.auth.signOut()
    }

  } catch (error) {
    console.error('Account deletion error:', error)
    throw error
  }
}