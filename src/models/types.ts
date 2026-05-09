/**
 * LifeLog AI - Data Models
 * 
 * These are all the data types used throughout the app.
 * Each model is Serializable (plain objects) so they can be
 * easily stored in localStorage, JSON files, or later a real database.
 * 
 * When migrating to a real backend, these same types can be reused
 * as the shape of your API responses.
 */

/** User profile - stored after login */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

/** Entry tag types for categorizing journal logs */
export type EntryTag = 'general' | 'expense' | 'food' | 'sleep' | 'exercise' | 'note';

/** A single daily log entry (free-text journal style) */
export interface DailyLogEntry {
  id: string;
  userId: string;
  text: string;
  tag: EntryTag;
  createdAt: string;
  /** AI-classified structured data (filled later by Gemini) */
  classifiedData?: Record<string, unknown>;
}

/** An expense entry with amount, category, and note */
export interface ExpenseEntry {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  createdAt: string;
}

/** A food entry with name, portion, and optional calories */
export interface FoodEntry {
  id: string;
  userId: string;
  name: string;
  portionSize: string;
  calories?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
}

/** A sleep summary for a given date */
export interface SleepEntry {
  id: string;
  userId: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  date: string;
  createdAt: string;
}

/** Steps / distance activity entry */
export interface ActivityEntry {
  id: string;
  userId: string;
  steps: number;
  distanceKm?: number;
  date: string;
  source: 'manual' | 'healthkit';
  createdAt: string;
}

/** A file attachment (PDF or image) */
export interface FileAttachment {
  id: string;
  userId: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  /** For web demo, we store a data URL or placeholder */
  localUrl: string;
  thumbnailUrl?: string;
  /** OCR / extracted text from AI (placeholder for Gemini) */
  extractedText?: string;
  createdAt: string;
}

/** A reminder with optional recurrence */
export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description: string;
  dateTime: string;
  isRecurring: boolean;
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly';
  isCompleted: boolean;
  createdAt: string;
}

/** Chat message for the AI / Search screen */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Dashboard summary for aggregated views */
export interface DashboardSummary {
  totalExpensesToday: number;
  totalExpensesWeek: number;
  mealsToday: number;
  caloriesEstimate: number;
  sleepHoursToday: number;
  sleepAvgWeek: number;
  stepsToday: number;
  entriesCount: number;
}

/** Expense categories */
export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Other',
] as const;

/** Entry tag labels and colors */
export const TAG_CONFIG: Record<EntryTag, { label: string; color: string; bg: string }> = {
  general: { label: 'General', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  expense: { label: 'Expense', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  food: { label: 'Food', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  sleep: { label: 'Sleep', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  exercise: { label: 'Exercise', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  note: { label: 'Note', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};
