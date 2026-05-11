/**
 * LifeLog AI - Data Models
 * 
 * All data types used throughout the app.
 * Designed to work with Supabase for cloud storage.
 */

/** User profile */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

/** Entry tag types */
export type EntryTag = 'general' | 'expense' | 'food' | 'sleep' | 'exercise' | 'note' | 'movie' | 'music' | 'book' | 'health';

/** A daily log entry */
export interface DailyLogEntry {
  id: string;
  userId: string;
  text: string;
  tag: EntryTag;
  createdAt: string;
  classifiedData?: Record<string, unknown>;
}

/** An expense entry - now in INR */
export interface ExpenseEntry {
  id: string;
  userId: string;
  amount: number;
  currency: string; // 'INR'
  category: string;
  note: string;
  createdAt: string;
}

/** A food entry */
export interface FoodEntry {
  id: string;
  userId: string;
  name: string;
  portionSize: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
}

/** A sleep entry */
export interface SleepEntry {
  id: string;
  userId: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  bedTime?: string;
  wakeTime?: string;
  date: string;
  createdAt: string;
}

/** Activity entry */
export interface ActivityEntry {
  id: string;
  userId: string;
  steps: number;
  distanceKm?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  date: string;
  source: 'manual' | 'healthkit';
  createdAt: string;
}

/** File attachment */
export interface FileAttachment {
  id: string;
  userId: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  localUrl: string;
  thumbnailUrl?: string;
  extractedText?: string;
  extractedAmount?: number;
  createdAt: string;
}

/** Reminder */
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

/** Chat message */
export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Custom list item (for movies, songs, books, etc.) */
export interface ListItem {
  id: string;
  userId: string;
  listType: 'movie' | 'music' | 'book' | 'podcast' | 'show' | 'game' | 'custom';
  title: string;
  note?: string;
  rating?: number; // 1-5
  status: 'watched' | 'listening' | 'reading' | 'playing' | 'completed' | 'want_to' | 'in_progress';
  dateAdded: string;
  dateCompleted?: string;
  createdAt: string;
}

/** Health metrics - daily check-in */
export interface HealthMetrics {
  id: string;
  userId: string;
  date: string;
  weight?: number; // kg
  waterIntake?: number; // glasses
  mood?: 'great' | 'good' | 'okay' | 'low' | 'bad';
  energyLevel?: number; // 1-10
  stressLevel?: number; // 1-10
  symptoms?: string; // e.g. "headache, bloating"
  notes?: string;
  createdAt: string;
}

/** Health profile - persistent body data (editable, saved once) */
export interface HealthProfile {
  userId: string;
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  medicalConditions: string; // comma-separated
  allergies: string;
  dietPreference: 'veg' | 'non-veg' | 'vegan' | 'eggetarian';
  fitnessGoal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'general_fitness';
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyStepsTarget?: number;
  dailyWaterTarget?: number; // glasses
  dailySleepTarget?: number; // hours
  updatedAt: string;
}

/** Activity timeline - tracks EVERYTHING */
export interface ActivityTimeline {
  id: string;
  userId: string;
  action: string; // What was done
  category: EntryTag | 'list' | 'health' | 'file' | 'reminder';
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Dashboard summary */
export interface DashboardSummary {
  totalExpensesToday: number;
  totalExpensesWeek: number;
  totalExpensesMonth: number;
  mealsToday: number;
  caloriesEstimate: number;
  proteinToday: number;
  carbsToday: number;
  fatToday: number;
  sleepHoursToday: number;
  sleepAvgWeek: number;
  stepsToday: number;
  entriesCount: number;
  waterIntake: number;
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
  'Groceries',
  'Rent',
  'Travel',
  'Subscriptions',
  'Personal Care',
  'Gifts',
  'Other',
] as const;

/** List types */
export const LIST_TYPES = [
  { id: 'movie', label: 'Movies', emoji: '🎬' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'book', label: 'Books', emoji: '📚' },
  { id: 'podcast', label: 'Podcasts', emoji: '🎙️' },
  { id: 'show', label: 'TV Shows', emoji: '📺' },
  { id: 'game', label: 'Games', emoji: '🎮' },
  { id: 'custom', label: 'Custom', emoji: '📝' },
] as const;

/** Entry tag labels and colors */
export const TAG_CONFIG: Record<EntryTag, { label: string; color: string; bg: string; emoji: string }> = {
  general: { label: 'General', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', emoji: '📋' },
  expense: { label: 'Expense', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', emoji: '💰' },
  food: { label: 'Food', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '🍽️' },
  sleep: { label: 'Sleep', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', emoji: '😴' },
  exercise: { label: 'Exercise', color: '#10b981', bg: 'rgba(16,185,129,0.1)', emoji: '🏃' },
  note: { label: 'Note', color: '#64748b', bg: 'rgba(100,116,139,0.1)', emoji: '📌' },
  movie: { label: 'Movie', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', emoji: '🎬' },
  music: { label: 'Music', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', emoji: '🎵' },
  book: { label: 'Book', color: '#84cc16', bg: 'rgba(132,204,22,0.1)', emoji: '📚' },
  health: { label: 'Health', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', emoji: '❤️' },
};

/** Format currency in INR */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format date for display */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format time */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format datetime */
export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
}
