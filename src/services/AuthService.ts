/**
 * AuthService - Authentication logic
 * 
 * Manages user authentication via Supabase.
 */

import { v4 as uuid } from 'uuid';
import type { User } from '../models/types';
import { StorageService } from './StorageService';
import { SupabaseAuth, isSupabaseConfigured } from './SupabaseService';

const AUTH_KEY = 'current_user';

export const AuthService = {
  /** 
   * Login using Supabase if configured, otherwise falls back to simulation
   */
  async login(loginId: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!loginId.trim()) {
      return { success: false, error: 'Please enter your login ID.' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }

    // Try real Supabase auth if configured
    if (isSupabaseConfigured()) {
      const { data, error } = await SupabaseAuth.signIn(loginId.trim(), password.trim());
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        const user: User = {
          id: data.user.id,
          username: data.user.email || loginId.trim(),
          email: data.user.email || '',
          displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'User',
          createdAt: data.user.created_at,
        };
        StorageService.save(AUTH_KEY, user);
        return { success: true, user };
      }
    }

    // Fallback/Demo mode if Supabase not configured or failed
    console.warn('Using demo mode login - Supabase not configured or failed');
    const user: User = {
      id: uuid(),
      username: loginId.trim(),
      email: loginId.includes('@') ? loginId.trim() : `${loginId.trim()}@example.com`,
      displayName: loginId.trim().split('@')[0],
      createdAt: new Date().toISOString(),
    };
    StorageService.save(AUTH_KEY, user);
    return { success: true, user };
  },

  /** 
   * Sign up using Supabase
   */
  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to environment variables.' };
    }

    const { error } = await SupabaseAuth.signUp(email, password);
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /** Get the currently logged-in user */
  getCurrentUser(): User | null {
    return StorageService.load<User>(AUTH_KEY);
  },

  /** Log out the current user */
  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      await SupabaseAuth.signOut();
    }
    StorageService.remove(AUTH_KEY);
    StorageService.remove('app_state'); // Clear state on logout to force fresh fetch on next login
  },

  /** Check if a user is logged in */
  isLoggedIn(): boolean {
    return StorageService.load<User>(AUTH_KEY) !== null;
  },
};
