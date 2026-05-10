/**
 * AuthService - Authentication logic
 * 
 * Currently simulates login locally with a dummy user.
 * 
 * TO ADD REAL AUTH:
 * 1. Replace the `login` method with a real API call to your backend
 *    (e.g., Firebase Auth, Auth0, or a custom JWT-based API).
 * 2. Store the auth token in StorageService.
 * 3. Add `logout`, `refreshToken`, `register` methods as needed.
 */

import { v4 as uuid } from 'uuid';
import type { User } from '../models/types';
import { StorageService } from './StorageService';

const AUTH_KEY = 'current_user';

export const AuthService = {
  /** Simulate login - validates non-empty fields and creates a user */
  login(loginId: string, password: string): { success: boolean; user?: User; error?: string } {
    if (!loginId.trim()) {
      return { success: false, error: 'Please enter your login ID.' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }
    // In a real app, you would validate credentials against a backend here
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

  /** Get the currently logged-in user */
  getCurrentUser(): User | null {
    return StorageService.load<User>(AUTH_KEY);
  },

  /** Log out the current user */
  logout(): void {
    StorageService.remove(AUTH_KEY);
  },

  /** Check if a user is logged in */
  isLoggedIn(): boolean {
    return StorageService.load<User>(AUTH_KEY) !== null;
  },
};
