/**
 * AppContext - Global State (local-first, Supabase sync in background)
 * 
 * Production-ready state with Deleted Backup and Optimized Sync.
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

interface DeletedEntry {
  id: string;
  originalType: 'log' | 'expense' | 'food' | 'sleep' | 'activity' | 'list' | 'reminder';
  data: any;
  deletedAt: string;
}

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
  deletedEntries: DeletedEntry[];
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
  | { type: 'UPDATE_PROFILE'; displayName: string; email: string; avatarUrl?: string }
  | { type: 'ADD_SYNC_ERROR'; error: string }
  | { type: 'CLEAR_SYNC_ERRORS' }
  | { type: 'DELETE_LOG'; id: string }
  | { type: 'DELETE_EXPENSE'; id: string }
  | { type: 'DELETE_FOOD'; id: string }
  | { type: 'DELETE_SLEEP'; id: string }
  | { type: 'DELETE_ACTIVITY'; id: string }
  | { type: 'RESTORE_ENTRY'; id: string };

const initialState: AppState = {
  user: null, isLoggedIn: false, darkMode: false, isLoading: false,
  dailyLogs: [], expenses: [], foodEntries: [], sleepEntries: [],
  activities: [], files: [], reminders: [], chatMessages: [],
  listItems: [], healthMetrics: [], activityTimeline: [], 
  deletedEntries: [], syncErrors: [],
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
    case 'DELETE_REMINDER': {
      const reminder = state.reminders.find(r => r.id === action.id);
      return { 
        ...state, 
        reminders: state.reminders.filter(r => r.id !== action.id),
        deletedEntries: reminder ? [{ id: action.id, originalType: 'reminder', data: reminder, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'ADD_CHAT_MESSAGE': return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'ADD_LIST_ITEM': return { ...state, listItems: [action.item, ...state.listItems] };
    case 'UPDATE_LIST_ITEM': return { ...state, listItems: state.listItems.map(i => i.id === action.item.id ? action.item : i) };
    case 'DELETE_LIST_ITEM': {
      const item = state.listItems.find(i => i.id === action.id);
      return { 
        ...state, 
        listItems: state.listItems.filter(i => i.id !== action.id),
        deletedEntries: item ? [{ id: action.id, originalType: 'list', data: item, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'ADD_HEALTH_METRICS': return { ...state, healthMetrics: [action.metrics, ...state.healthMetrics] };
    case 'ADD_TIMELINE': return { ...state, activityTimeline: [action.entry, ...state.activityTimeline] };
    case 'LOAD_STATE': return { ...state, ...action.state };
    case 'UPDATE_PROFILE':
      if (!state.user) return state;
      return { 
        ...state, 
        user: { 
          ...state.user, 
          displayName: action.displayName, 
          email: action.email,
          avatarUrl: action.avatarUrl || state.user.avatarUrl
        } 
      };
    case 'ADD_SYNC_ERROR': return { ...state, syncErrors: [...state.syncErrors.slice(-4), action.error] };
    case 'CLEAR_SYNC_ERRORS': return { ...state, syncErrors: [] };
    case 'DELETE_LOG': {
      const entry = state.dailyLogs.find(l => l.id === action.id);
      return { 
        ...state, 
        dailyLogs: state.dailyLogs.filter(l => l.id !== action.id),
        deletedEntries: entry ? [{ id: action.id, originalType: 'log', data: entry, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'DELETE_EXPENSE': {
      const entry = state.expenses.find(e => e.id === action.id);
      return { 
        ...state, 
        expenses: state.expenses.filter(e => e.id !== action.id),
        deletedEntries: entry ? [{ id: action.id, originalType: 'expense', data: entry, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'DELETE_FOOD': {
      const entry = state.foodEntries.find(f => f.id === action.id);
      return { 
        ...state, 
        foodEntries: state.foodEntries.filter(f => f.id !== action.id),
        deletedEntries: entry ? [{ id: action.id, originalType: 'food', data: entry, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'DELETE_SLEEP': {
      const entry = state.sleepEntries.find(s => s.id === action.id);
      return { 
        ...state, 
        sleepEntries: state.sleepEntries.filter(s => s.id !== action.id),
        deletedEntries: entry ? [{ id: action.id, originalType: 'sleep', data: entry, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'DELETE_ACTIVITY': {
      const entry = state.activities.find(a => a.id === action.id);
      return { 
        ...state, 
        activities: state.activities.filter(a => a.id !== action.id),
        deletedEntries: entry ? [{ id: action.id, originalType: 'activity', data: entry, deletedAt: new Date().toISOString() }, ...state.deletedEntries] : state.deletedEntries
      };
    }
    case 'RESTORE_ENTRY': {
      const entry = state.deletedEntries.find(e => e.id === action.id);
      if (!entry) return state;
      const newState = { ...state, deletedEntries: state.deletedEntries.filter(e => e.id !== action.id) };
      switch (entry.originalType) {
        case 'log': newState.dailyLogs = [entry.data, ...state.dailyLogs]; break;
        case 'expense': newState.expenses = [entry.data, ...state.expenses]; break;
        case 'food': newState.foodEntries = [entry.data, ...state.foodEntries]; break;
        case 'sleep': newState.sleepEntries = [entry.data, ...state.sleepEntries]; break;
        case 'activity': newState.activities = [entry.data, ...state.activities]; break;
        case 'list': newState.listItems = [entry.data, ...state.listItems]; break;
        case 'reminder': newState.reminders = [entry.data, ...state.reminders]; break;
      }
      return newState;
    }
    default: return state;
  }
}

// ─── Context type ────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addLog: (text: string, tag: EntryTag) => void;
  updateLog: (id: string, text: string, tag: EntryTag) => void;
  addExpense: (amount: number, category: string, note: string) => void;
  updateExpense: (id: string, amount: number, category: string, note: string) => void;
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
  updateProfile: (displayName: string, email: string, avatarUrl?: string) => Promise<void>;
  restoreEntry: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────

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
  const userIdRef = useRef('');
  userIdRef.current = state.user?.id || '';

  useEffect(() => {
    const saved = StorageService.load<Partial<AppState>>('app_state');
    if (saved) dispatch({ type: 'LOAD_STATE', state: saved });
  }, []);

  useEffect(() => {
    if (!state.isLoggedIn) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { syncErrors: _se, isLoading: _il, ...rest } = state;
      StorageService.save('app_state', rest);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  const userId = state.user?.id;
  useEffect(() => {
    if (!state.isLoggedIn || !userId || !isSupabaseConfigured() || cloudLoaded.current) return;
    cloudLoaded.current = true;

    (async () => {
      dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const cloud = await SupabaseDB.loadAllData(userId);
        const profile = await SupabaseDB.getProfile(userId);
        
        const merged: Partial<AppState> = { ...cloud };
        if (profile && state.user) {
          merged.user = { 
            ...state.user, 
            displayName: profile.displayName || state.user.displayName,
            avatarUrl: profile.avatarUrl || state.user.avatarUrl
          };
        }
        dispatch({ type: 'LOAD_STATE', state: merged });
      } catch (e) { console.error('Cloud load error:', e); }
      dispatch({ type: 'SET_LOADING', loading: false });
    })();
  }, [state.isLoggedIn, userId, state.user]);

  const uid = useCallback(() => userIdRef.current, []);

  const addLog = useCallback((text: string, tag: EntryTag) => {
    const entry: DailyLogEntry = { id: uuid(), userId: uid(), text, tag, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_LOG', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveDailyLog(entry));
  }, [uid]);

  const updateLog = useCallback((id: string, text: string, tag: EntryTag) => {
    const entry = state.dailyLogs.find(l => l.id === id);
    if (!entry) return;
    const updated = { ...entry, text, tag };
    dispatch({ type: 'LOAD_STATE', state: { dailyLogs: state.dailyLogs.map(l => l.id === id ? updated : l) } });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveDailyLog(updated));
  }, [uid, state.dailyLogs]);

  const addExpense = useCallback((amount: number, category: string, note: string) => {
    const entry: ExpenseEntry = { id: uuid(), userId: uid(), amount, currency: 'INR', category, note, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_EXPENSE', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveExpense(entry));
  }, [uid]);

  const updateExpense = useCallback((id: string, amount: number, category: string, note: string) => {
    const entry = state.expenses.find(e => e.id === id);
    if (!entry) return;
    const updated = { ...entry, amount, category, note };
    dispatch({ type: 'LOAD_STATE', state: { expenses: state.expenses.map(e => e.id === id ? updated : e) } });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveExpense(updated));
  }, [uid, state.expenses]);

  const addFood = useCallback((name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType']) => {
    const entry: FoodEntry = { id: uuid(), userId: uid(), name, portionSize, calories, mealType, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_FOOD', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveFood(entry));
  }, [uid]);

  const addSleep = useCallback((hours: number, quality: SleepEntry['quality']) => {
    const entry: SleepEntry = { id: uuid(), userId: uid(), hours, quality, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_SLEEP', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveSleep(entry));
  }, [uid]);

  const addActivity = useCallback((steps: number, distanceKm?: number) => {
    const entry: ActivityEntry = { id: uuid(), userId: uid(), steps, distanceKm, date: new Date().toISOString().split('T')[0], source: 'manual', createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_ACTIVITY', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveActivity(entry));
  }, [uid]);

  const addFile = useCallback((fileName: string, fileType: 'pdf' | 'image', localUrl: string) => {
    dispatch({ type: 'ADD_FILE', file: { id: uuid(), userId: uid(), fileName, fileType, localUrl, createdAt: new Date().toISOString() } });
  }, [uid]);

  const addReminder = useCallback((title: string, description: string, dateTime: string, isRecurring: boolean) => {
    const entry: Reminder = { id: uuid(), userId: uid(), title, description, dateTime, isRecurring, isCompleted: false, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_REMINDER', reminder: entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveReminder(entry));
  }, [uid]);

  const toggleReminder = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_REMINDER', id });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.updateReminderStatus(id, true));
  }, []);

  const deleteReminder = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REMINDER', id });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.deleteData('reminders', id));
  }, []);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: { id: uuid(), userId: uid(), role, content, timestamp: new Date().toISOString() } });
  }, [uid]);

  const addListItem = useCallback((listType: ListItem['listType'], title: string) => {
    const item: ListItem = { id: uuid(), userId: uid(), listType, title, status: 'completed', dateAdded: new Date().toISOString(), createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_LIST_ITEM', item });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveListItem(item));
  }, [uid]);

  const deleteListItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LIST_ITEM', id });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.deleteData('list_items', id));
  }, []);

  const addHealthMetrics = useCallback((data: Partial<HealthMetrics>) => {
    const m: HealthMetrics = { id: uuid(), userId: uid(), date: new Date().toISOString().split('T')[0], ...data, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_HEALTH_METRICS', metrics: m });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveHealthMetrics(m));
  }, [uid]);

  const addTimeline = useCallback((action: string, category: ActivityTimeline['category'], details: string) => {
    const entry: ActivityTimeline = { id: uuid(), userId: uid(), action, category, details, createdAt: new Date().toISOString() };
    dispatch({ type: 'ADD_TIMELINE', entry });
    if (isSupabaseConfigured()) bgSync(dispatch, () => SupabaseDB.saveTimeline(entry));
  }, [uid]);

  const updateProfile = useCallback(async (displayName: string, email: string, avatarUrl?: string) => {
    dispatch({ type: 'UPDATE_PROFILE', displayName, email, avatarUrl });
    if (state.user) {
      await SupabaseDB.saveProfile(state.user.id, { displayName, avatarUrl: avatarUrl || state.user.avatarUrl });
    }
  }, [state.user]);

  const restoreEntry = useCallback((id: string) => {
    dispatch({ type: 'RESTORE_ENTRY', id });
    // In a full production app, we would also restore in Supabase
  }, []);

  const contextValue = useMemo(() => ({
    state, dispatch,
    addLog, updateLog, addExpense, updateExpense, addFood, addSleep, addActivity, addFile,
    addReminder, addChatMessage, addListItem, deleteListItem,
    addHealthMetrics, addTimeline, toggleReminder, deleteReminder,
    updateProfile, restoreEntry
  }), [state, addLog, updateLog, addExpense, updateExpense, addFood, addSleep, addActivity, addFile,
    addReminder, addChatMessage, addListItem, deleteListItem,
    addHealthMetrics, addTimeline, toggleReminder, deleteReminder, updateProfile, restoreEntry]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
