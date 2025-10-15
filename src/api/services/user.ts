/**
 * User Service
 * Handles user-related operations
 */

import { RequestContext } from '../types/api'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  name?: string
  role: string
  avatar?: string
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface UserUpdateRequest {
  name?: string
  avatar?: string
  preferences?: Record<string, any>
}

export class UserService {
  async getUserProfile(userId: string, context?: RequestContext): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to get user profile: ${error.message}`)
      }

      return this.transformDbUserToUserProfile(data)
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  }

  async updateUserProfile(userId: string, request: UserUpdateRequest, context?: RequestContext): Promise<UserProfile> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (request.name !== undefined) {
        updateData.name = request.name
      }
      if (request.avatar !== undefined) {
        updateData.avatar = request.avatar
      }
      if (request.preferences !== undefined) {
        updateData.preferences = request.preferences
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update user profile: ${error.message}`)
      }

      return this.transformDbUserToUserProfile(data)
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  async createUserProfile(userData: {
    id: string
    email: string
    name?: string
  }, context?: RequestContext): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: 'user',
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create user profile: ${error.message}`)
      }

      return this.transformDbUserToUserProfile(data)
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  async deleteUserProfile(userId: string, context?: RequestContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        throw new Error(`Failed to delete user profile: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting user profile:', error)
      throw error
    }
  }

  async getUserProjects(userId: string, context?: RequestContext): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get user projects: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting user projects:', error)
      throw error
    }
  }

  private transformDbUserToUserProfile(dbUser: any): UserProfile {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      avatar: dbUser.avatar,
      preferences: dbUser.preferences || {},
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    }
  }
}

export default UserService