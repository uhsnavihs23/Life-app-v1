/**
 * StorageService - Data persistence layer
 * 
 * This service abstracts all data storage behind simple methods.
 * Currently uses localStorage for persistence.
 * 
 * TO MIGRATE TO A REAL DATABASE:
 * 1. Replace the localStorage calls with your database SDK calls
 *    (e.g., Core Data, SQLite, Firebase, or a REST API).
 * 2. Keep the same method signatures so the rest of the app doesn't change.
 */

const STORAGE_PREFIX = 'lifelog_';

export const StorageService = {
  /** Save data under a key */
  save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error('StorageService save error:', e);
    }
  },

  /** Load data from a key, returns null if not found */
  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error('StorageService load error:', e);
      return null;
    }
  },

  /** Remove data at a key */
  remove(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  /** Clear all LifeLog data */
  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  },
};
