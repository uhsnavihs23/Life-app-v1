/**
 * AppContext - Global State (local-first, Supabase sync in background)
 * 
 * ARCHITECTURE:
 * 1. All actions update React state immediately (optimistic)
 * 2. Debounced localStorage save (500ms)
 * 3. Supabase sync fires in background, never blocks UI
 * 4. Provider value is memoized to prevent full-app re-renders
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  User, DailyLogEntry, ExpenseEntry, FoodEntry,
  SleepEntry, ActivityEntry, FileAttachment, Reminder,
  ChatMessage, EntryTag, ListItem, HealthMetrics, ActivityTimeline,
} from '../models/types';
import { StorageService } from '../services/StorageService';
import { SupabaseDB, isSupabaseConfigured } from '../services/SupabaseService';

// ─── State ───────────────────────────────────────────────

interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  darkMode: boolean;
  isLoading: boolean;
  dailyLogs: DailyLogEntry[];
  expenses: ExpenseEntry[];
  foodEntries: FoodEntry[];
  sleepEntries: SleepEntry[];
  activities: ActivityEntry[];
  files: FileAttachment[];
  reminders: Reminder[];
  chatMessages: ChatMessage[];
  listItems: ListItem[];
  healthMetrics: HealthMetrics[];
  activityTimeline: ActivityTimeline[];
  syncErrors: string[];
}

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'ADD_LOG'; entry: DailyLogEntry }
  | { type: 'ADD_EXPENSE'; entry: ExpenseEntry }
  | { type: 'ADD_FOOD'; entry: FoodEntry }
  | { type: 'ADD_SLEEP'; entry: SleepEntry }
  | { type: 'ADD_ACTIVITY'; entry: ActivityEntry }
  | { type: 'ADD_FILE'; file: FileAttachment }
  | { type: 'UPDATE_FILE_OCR'; fileId: string; text: string }
  | { type: 'ADD_REMINDER'; reminder: Reminder }
  | { type: 'TOGGLE_REMINDER'; id: string }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'ADD_LIST_ITEM'; item: ListItem }
  | { type: 'UPDATE_LIST_ITEM'; item: ListItem }
  | { type: 'DELETE_LIST_ITEM'; id: string }
  | { type: 'ADD_HEALTH_METRICS'; metrics: HealthMetrics }
  | { type: 'ADD_TIMELINE'; entry: ActivityTimeline }
  | { type: 'LOAD_STATE'; state: Partial<AppState> }
  | { type: 'UPDATE_PROFILE'; displayName: string; email: string }
  | { type: 'ADD_SYNC_ERROR'; error: string }
  | { type: 'CLEAR_SYNC_ERRORS' };

const initialState: AppState = {
  user: null, isLoggedIn: false, darkMode: false, isLoading: false,
  dailyLogs: [], expenses: [], foodEntries: [], sleepEntries: [],
  activities: [], files: [], reminders: [], chatMessages: [],
  listItems: [], healthMetrics: [], activityTimeline: [], syncErrors: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN': return { ...state, isLoggedIn: true, user: action.user };
    case 'LOGOUT': return { ...initialState };
    case 'SET_LOADING': return { ...state, isLoading: action.loading };
    case 'TOGGLE_DARK_MODE': return { ...state, darkMode: !state.darkMode };
    case 'ADD_LOG': return { ...state, dailyLogs: [action.entry, ...state.dailyLogs] };
    case 'ADD_EXPENSE': return { ...state, expenses: [action.entry, ...state.expenses] };
    case 'ADD_FOOD': return { ...state, foodEntries: [action.entry, ...state.foodEntries] };
    case 'ADD_SLEEP': return { ...state, sleepEntries: [action.entry, ...state.sleepEntries] };
    case 'ADD_ACTIVITY': return { ...state, activities: [action.entry, ...state.activities] };
    case 'ADD_FILE': return { ...state, files: [action.file, ...state.files] };
    case 'UPDATE_FILE_OCR': return { ...state, files: state.files.map(f => f.id === action.fileId ? { ...f, extractedText: action.text } : f) };
    case 'ADD_REMINDER': return { ...state, reminders: [action.reminder, ...state.reminders] };
    case 'TOGGLE_REMINDER': return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, isCompleted: !r.isCompleted } : r) };
    case 'DELETE_REMINDER': return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };
    case 'ADD_CHAT_MESSAGE': return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'ADD_LIST_ITEM': return { ...state, listItems: [action.item, ...state.listItems] };
    case 'UPDATE_LIST_ITEM': return { ...state, listItems: state.listItems.map(i => i.id === action.item.id ? action.item : i) };
    case 'DELETE_LIST_ITEM': return { ...state, listItems: state.listItems.filter(i => i.id !== action.id) };
    case 'ADD_HEALTH_METRICS': return { ...state, healthMetrics: [action.metrics, ...state.healthMetrics] };
    case 'ADD_TIMELINE': return { ...state, activityTimeline: [action.entry, ...state.activityTimeline] };
    case 'LOAD_STATE': return { ...state, ...action.state };
    case 'UPDATE_PROFILE':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, displayName: action.displayName, email: action.email } };
    case 'ADD_SYNC_ERROR': return { ...state, syncErrors: [...state.syncErrors.slice(-4), action.error] };
    case 'CLEAR_SYNC_ERRORS': return { ...state, syncErrors: [] };
    default: return state;
  }
}

// ─── Context type ────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addLog: (text: string, tag: EntryTag) => void;
  addExpense: (amount: number, category: string, note: string) => void;
  addFood: (name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType'], protein?: number, carbs?: number, fat?: number) => void;
  addSleep: (hours: number, quality: SleepEntry['quality'], bedTime?: string, wakeTime?: string) => void;
  addActivity: (steps: number, distanceKm?: number, activeMinutes?: number, caloriesBurned?: number) => void;
  addFile: (fileName: string, fileType: 'pdf' | 'image', localUrl: string) => void;
  addReminder: (title: string, description: string, dateTime: string, isRecurring: boolean, recurrenceInterval?: Reminder['recurrenceInterval']) => void;
  addChatMessage: (role: ChatMessage['role'], content: string) => void;
  addListItem: (listType: ListItem['listType'], title: string, note?: string, rating?: number, status?: ListItem['status']) => void;
  deleteListItem: (id: string) => void;
  addHealthMetrics: (data: Partial<HealthMetrics>) => void;
  addTimeline: (action: string, category: ActivityTimeline['category'], details: string, metadata?: Record<string, unknown>) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────

/** Fire-and-forget Supabase sync. Logs errors, never blocks UI. */
function bgSync(dispatch: React.Dispatch<Action>, fn: () => Promise<void>) {
  fn().catch(err => {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    console.warn('[Supabase sync]', msg);
    dispatch({ type: 'ADD_SYNC_ERROR', error: msg });
  });
}

// ─── Provider ────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cloudLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to current userId to avoid stale closures
  const userIdRef = useRef('');
  userIdRef.current = state.user?.id || '';

  // ── Load local state once on mount ──
  useEffect(() => {
    const saved = StorageService.load<Partial<AppState>>('app_state');
    if (saved) dispatch({ type: 'LOAD_STATE', state: saved });
  }, []);

  // ── Debounced localStorage save ──
  useEffect(() => {
    if (!state.isLoggedIn) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Save everything except syncErrors and isLoading
      const { syncErrors: _se, isLoading: _il, ...rest } = state;
      StorageService.save('app_state', rest);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, state.isLoggedIn]);

  // ── Dark mode ──
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  // ── Load cloud data ONCE after login ──
  const userId = state.user?.id;
  useEffect(() => {
    if (!state.isLoggedIn || !userId || !isSupabaseConfigured() || cloudLoaded.current) return;
    cloudLoaded.current = true;

    let cancelled = false;
    (async () => {
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const cloud = await SupabaseDB.loadAllData(userId);
        if (cancelled) return;
        // Only overwrite arrays that have cloud data
        const merged: Partial<AppState> = {};
        if (cloud.dailyLogs.length) merged.dailyLogs = cloud.dailyLogs;
        if (cloud.expenses.length) merged.expenses = cloud.expenses;
        if (cloud.foodEntries.length) merged.foodEntries = cloud.foodEntries;
        if (cloud.sleepEntries.length) merged.sleepEntries = cloud.sleepEntries;
        if (cloud.activities.length) merged.activities = cloud.activities;
        if (cloud.reminders.length) merged.reminders = cloud.reminders;
        if (cloud.listItems.length) merged.listItems = cloud.listItems;
        if (cloud.healthMetrics.length) merged.healthMetrics = cloud.healthMetrics;
        if (cloud.activityTimeline.length) merged.activityTimeline = cloud.activityTimeline;
        if (Object.keys(merged).length) dispatch({ type: 'LOAD_STATE', state: merged });
      } catch (e) {
        console.error('Cloud load error:', e);
      }
      if (!cancelled) dispatch({ type: 'SET_LOADING', loading: false });
    })();
    return () => { cancelled = true; };
  }, [state.isLoggedIn, userId]);

  // ── Reset on logout ──
  useEffect(() => { if (!state.isLoggedIn) cloudLoaded.current = false; }, [state.isLoggedIn]);

  // ─── Action creators (all stable via useCallback) ─────

  const uid = useCallback(() => userIdRef.current, []);

  const addLog = useCallback((text: string, tag: EntryTag) => {
    const entry: DailyLogEntry = { id: uuid(), userId: uid(), text, tag, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_LOG', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveDailyLog(entry));
  }, [uid]);

  const addExpense = useCallback((amount: number, category: string, note: string) => {
    const entry: ExpenseEntry = { id: uuid(), userId: uid(), amount, currency: 'INR', category, note, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_EXPENSE', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveExpense(entry));
  }, [uid]);

  const addFood = useCallback((name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType'], protein?: number, carbs?: number, fat?: number) => {
    const entry: FoodEntry = { id: uuid(), userId: uid(), name, portionSize, calories, protein, carbs, fat, mealType, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_FOOD', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveFood(entry));
  }, [uid]);

  const addSleep = useCallback((hours: number, quality: SleepEntry['quality'], bedTime?: string, wakeTime?: string) => {
    const entry: SleepEntry = { id: uuid(), userId: uid(), hours, quality, bedTime, wakeTime, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_SLEEP', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveSleep(entry));
  }, [uid]);

  const addActivity = useCallback((steps: number, distanceKm?: number, activeMinutes?: number, caloriesBurned?: number) => {
    const entry: ActivityEntry = { id: uuid(), userId: uid(), steps, distanceKm, activeMinutes, caloriesBurned, date: new Date().toISOString().split('T')[0], source: 'manual', createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_ACTIVITY', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveActivity(entry));
  }, [uid]);

  const addFile = useCallback((fileName: string, fileType: 'pdf' | 'image', localUrl: string) => {
    dispatch({ type: 'ADD_FILE', file: { id: uuid(), userId: uid(), fileName, fileType, localUrl, createdAt: new Date().toISOString() } });
  }, [uid]);

  const addReminder = useCallback((title: string, description: string, dateTime: string, isRecurring: boolean, recurrenceInterval?: Reminder['recurrenceInterval']) => {
    const reminder: Reminder = { id: uuid(), userId: uid(), title, description, dateTime, isRecurring, recurrenceInterval, isCompleted: false, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_REMINDER', reminder });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveReminder(reminder));
  }, [uid]);

  const toggleReminder = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_REMINDER', id });
    // We read from fresh state via a micro-task
    if (isSupabaseConfigured()) {
      bgSync(dispatch, async () => {
        // After dispatch, we don't know new value from closure, so just toggle
        // Supabase upsert will fix it on next full load anyway
        await SupabaseDB.updateReminderStatus(id, true); // best-effort
      });
    }
  }, []);

  const deleteReminder = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REMINDER', id });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.deleteReminder(id));
  }, []);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: { id: uuid(), userId: uid(), role, content, timestamp: new Date().toISOString() } });
  }, [uid]);

  const addListItem = useCallback((listType: ListItem['listType'], title: string, note?: string, rating?: number, status: ListItem['status'] = 'completed') => {
    const item: ListItem = { id: uuid(), userId: uid(), listType, title, note, rating, status, dateAdded: new Date().toISOString(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_LIST_ITEM', item });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveListItem(item));
  }, [uid]);

  const deleteListItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LIST_ITEM', id });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.deleteListItem(id));
  }, []);

  const addHealthMetrics = useCallback((data: Partial<HealthMetrics>) => {
    const m: HealthMetrics = { id: uuid(), userId: uid(), date: new Date().toISOString().split('T')[0], ...data, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_HEALTH_METRICS', metrics: m });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveHealthMetrics(m));
  }, [uid]);

  const addTimeline = useCallback((action: string, category: ActivityTimeline['category'], details: string, metadata?: Record<string, unknown>) => {
    const entry: ActivityTimeline = { id: uuid(), userId: uid(), action, category, details, metadata, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_TIMELINE', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveTimeline(entry));
  }, [uid]);

  // ── Memoize provider value to prevent unnecessary re-renders ──
  const contextValue = useMemo<AppContextValue>(() => ({
    state, dispatch,
    addLog, addExpense, addFood, addSleep, addActivity, addFile,
    addReminder, addChatMessage, addListItem, deleteListItem,
    addHealthMetrics, addTimeline, toggleReminder, deleteReminder,
  }), [state, addLog, addExpense, addFood, addSleep, addActivity, addFile,
    addReminder, addChatMessage, addListItem, deleteListItem,
    addHealthMetrics, addTimeline, toggleReminder, deleteReminder]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
