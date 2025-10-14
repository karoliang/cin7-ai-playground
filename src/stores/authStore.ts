import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      initialize: async () => {
        try {
          set({ isLoading: true, error: null })

          // Initialize Supabase auth
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )

          const { data: { session }, error } = await supabase.auth.getSession()

          if (error) throw error

          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name,
              avatar: session.user.user_metadata?.avatar_url,
              created_at: session.user.created_at,
              updated_at: session.user.updated_at || session.user.created_at
            }

            set({ user, isAuthenticated: true })
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const user: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name,
                avatar: session.user.user_metadata?.avatar_url,
                created_at: session.user.created_at,
                updated_at: session.user.updated_at || session.user.created_at
              }

              set({ user, isAuthenticated: true, error: null })
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false, error: null })
            }
          })

        } catch (error) {
          console.error('Auth initialization error:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize authentication',
            isLoading: false
          })
        } finally {
          set({ isLoading: false })
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null })

          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) throw error

          if (data.user) {
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.name,
              avatar: data.user.user_metadata?.avatar_url,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at || data.user.created_at
            }

            set({ user, isAuthenticated: true })
          }

        } catch (error) {
          console.error('Sign in error:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to sign in',
            isLoading: false
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      signUp: async (email: string, password: string, name?: string) => {
        try {
          set({ isLoading: true, error: null })

          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
              }
            }
          })

          if (error) throw error

          if (data.user && data.user.email_confirmed_at) {
            const user: User = {
              id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata?.name || name,
              avatar: data.user.user_metadata?.avatar_url,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at || data.user.created_at
            }

            set({ user, isAuthenticated: true })
          }

        } catch (error) {
          console.error('Sign up error:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to sign up',
            isLoading: false
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null })

          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )

          const { error } = await supabase.auth.signOut()

          if (error) throw error

          set({ user: null, isAuthenticated: false })

        } catch (error) {
          console.error('Sign out error:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to sign out',
            isLoading: false
          })
        } finally {
          set({ isLoading: false })
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        try {
          set({ isLoading: true, error: null })

          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          )

          const currentUser = get().user
          if (!currentUser) throw new Error('No authenticated user')

          const { error } = await supabase.auth.updateUser({
            data: updates
          })

          if (error) throw error

          set({
            user: { ...currentUser, ...updates, updated_at: new Date().toISOString() }
          })

        } catch (error) {
          console.error('Update profile error:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update profile',
            isLoading: false
          })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)