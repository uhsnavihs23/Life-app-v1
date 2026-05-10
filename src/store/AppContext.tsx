/**
 * AppContext - Global State Management
 * 
 * Production-ready state with optimized Supabase sync and persistence.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  User, DailyLogEntry, ExpenseEntry, FoodEntry,
  SleepEntry, ActivityEntry, FileAttachment, Reminder,
  ChatMessage, EntryTag, ListItem, HealthMetrics, ActivityTimeline,
} from '../models/types';
import { StorageService } from '../services/StorageService';
import { SupabaseDB, isSupabaseConfigured } from '../services/SupabaseService';

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
  | { type: 'UPDATE_PROFILE'; displayName: string; email: string; avatarUrl?: string };

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  darkMode: false,
  isLoading: false,
  dailyLogs: [],
  expenses: [],
  foodEntries: [],
  sleepEntries: [],
  activities: [],
  files: [],
  reminders: [],
  chatMessages: [],
  listItems: [],
  healthMetrics: [],
  activityTimeline: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isLoggedIn: true, user: action.user };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'ADD_LOG':
      return { ...state, dailyLogs: [action.entry, ...state.dailyLogs] };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.entry, ...state.expenses] };
    case 'ADD_FOOD':
      return { ...state, foodEntries: [action.entry, ...state.foodEntries] };
    case 'ADD_SLEEP':
      return { ...state, sleepEntries: [action.entry, ...state.sleepEntries] };
    case 'ADD_ACTIVITY':
      return { ...state, activities: [action.entry, ...state.activities] };
    case 'ADD_FILE':
      return { ...state, files: [action.file, ...state.files] };
    case 'UPDATE_FILE_OCR':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.fileId ? { ...f, extractedText: action.text } : f
        ),
      };
    case 'ADD_REMINDER':
      return { ...state, reminders: [action.reminder, ...state.reminders] };
    case 'TOGGLE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r =>
          r.id === action.id ? { ...r, isCompleted: !r.isCompleted } : r
        ),
      };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'ADD_LIST_ITEM':
      return { ...state, listItems: [action.item, ...state.listItems] };
    case 'UPDATE_LIST_ITEM':
      return {
        ...state,
        listItems: state.listItems.map(i => i.id === action.item.id ? action.item : i),
      };
    case 'DELETE_LIST_ITEM':
      return { ...state, listItems: state.listItems.filter(i => i.id !== action.id) };
    case 'ADD_HEALTH_METRICS':
      return { ...state, healthMetrics: [action.metrics, ...state.healthMetrics] };
    case 'ADD_TIMELINE':
      return { ...state, activityTimeline: [action.entry, ...state.activityTimeline] };
    case 'LOAD_STATE':
      return { ...state, ...action.state };
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
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addLog: (text: string, tag: EntryTag) => Promise<void>;
  addExpense: (amount: number, category: string, note: string) => Promise<void>;
  addFood: (entry: Omit<FoodEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addSleep: (entry: Omit<SleepEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addActivity: (entry: Omit<ActivityEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addFile: (fileName: string, fileType: 'pdf' | 'image', localUrl: string) => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  addChatMessage: (role: ChatMessage['role'], content: string) => void;
  addListItem: (item: Omit<ListItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addHealthMetrics: (data: Partial<HealthMetrics>) => Promise<void>;
  addTimeline: (action: string, category: ActivityTimeline['category'], details: string) => Promise<void>;
  updateProfile: (displayName: string, email: string, avatarUrl?: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const dataLoaded = useRef(false);

  // Helper: Fetch cloud data once
  const fetchCloudData = useCallback(async (userId: string) => {
    if (dataLoaded.current) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    
    try {
      const data = await SupabaseDB.getAllData(userId);
      const profile = await SupabaseDB.getProfile(userId);
      
      const loadedState: Partial<AppState> = { ...data };
      if (profile && state.user) {
        loadedState.user = { 
          ...state.user, 
          displayName: profile.displayName || state.user.displayName,
          avatarUrl: profile.avatarUrl || state.user.avatarUrl
        };
      }
      
      dispatch({ type: 'LOAD_STATE', state: loadedState });
      dataLoaded.current = true;
    } catch (err) {
      console.error('Cloud load error:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [state.user]);

  // Load from local/cloud on mount
  useEffect(() => {
    const saved = StorageService.load<Partial<AppState>>('app_state');
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved });
      if (saved.user?.id) fetchCloudData(saved.user.id);
    }
  }, [fetchCloudData]);

  // Persist state to local
  useEffect(() => {
    if (state.isLoggedIn && state.user) {
      StorageService.save('app_state', state);
    }
  }, [state]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  // ============ ACTIONS ============

  const addTimelineEntry = useCallback(async (action: string, category: ActivityTimeline['category'], details: string) => {
    const entry: ActivityTimeline = {
      id: uuid(),
      userId: state.user?.id || '',
      action,
      category,
      details,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TIMELINE', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveTimeline(entry);
  }, [state.user]);

  const addLog = useCallback(async (text: string, tag: EntryTag) => {
    const entry: DailyLogEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      text,
      tag,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOG', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveDailyLog(entry);
    await addTimelineEntry('Added log', tag, text);
  }, [state.user, addTimelineEntry]);

  const addExpense = useCallback(async (amount: number, category: string, note: string) => {
    const entry: ExpenseEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      amount,
      currency: 'INR',
      category,
      note,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_EXPENSE', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveExpense(entry);
    await addTimelineEntry('Logged expense', 'expense', `₹${amount} - ${category}`);
  }, [state.user, addTimelineEntry]);

  const addFood = useCallback(async (data: Omit<FoodEntry, 'id' | 'userId' | 'createdAt'>) => {
    const entry: FoodEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      ...data,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_FOOD', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveFood(entry);
    await addTimelineEntry('Logged food', 'food', entry.name);
  }, [state.user, addTimelineEntry]);

  const addSleep = useCallback(async (data: Omit<SleepEntry, 'id' | 'userId' | 'createdAt'>) => {
    const entry: SleepEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      ...data,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SLEEP', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveSleep(entry);
    await addTimelineEntry('Logged sleep', 'sleep', `${entry.hours}h - ${entry.quality}`);
  }, [state.user, addTimelineEntry]);

  const addActivity = useCallback(async (data: Omit<ActivityEntry, 'id' | 'userId' | 'createdAt'>) => {
    const entry: ActivityEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      ...data,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ACTIVITY', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveActivity(entry);
    await addTimelineEntry('Logged activity', 'exercise', `${entry.steps} steps`);
  }, [state.user, addTimelineEntry]);

  const addFile = useCallback((fileName: string, fileType: 'pdf' | 'image', localUrl: string) => {
    const file: FileAttachment = {
      id: uuid(),
      userId: state.user?.id || '',
      fileName,
      fileType,
      localUrl,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_FILE', file });
    addTimelineEntry('Uploaded file', 'file', fileName);
  }, [state.user, addTimelineEntry]);

  const addReminder = useCallback(async (data: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'isCompleted'>) => {
    const entry: Reminder = {
      id: uuid(),
      userId: state.user?.id || '',
      ...data,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_REMINDER', entry });
    if (isSupabaseConfigured()) await SupabaseDB.saveReminder(entry);
    await addTimelineEntry('Created reminder', 'reminder', entry.title);
  }, [state.user, addTimelineEntry]);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    const message: ChatMessage = {
      id: uuid(),
      userId: state.user?.id || '',
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message });
  }, [state.user]);

  const addListItem = useCallback(async (data: Omit<ListItem, 'id' | 'userId' | 'createdAt'>) => {
    const item: ListItem = {
      id: uuid(),
      userId: state.user?.id || '',
      ...data,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LIST_ITEM', item });
    if (isSupabaseConfigured()) await SupabaseDB.saveListItem(item);
    await addTimelineEntry(`Added to ${item.listType}`, 'list', item.title);
  }, [state.user, addTimelineEntry]);

  const addHealthMetrics = useCallback(async (data: Partial<HealthMetrics>) => {
    const metrics: HealthMetrics = {
      id: uuid(),
      userId: state.user?.id || '',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      ...data,
    };
    dispatch({ type: 'ADD_HEALTH_METRICS', metrics });
    if (isSupabaseConfigured()) await SupabaseDB.saveHealthMetrics(metrics);
    await addTimelineEntry('Logged health', 'health', `Mood: ${data.mood || 'N/A'}`);
  }, [state.user, addTimelineEntry]);

  const addTimeline = useCallback(async (action: string, category: ActivityTimeline['category'], details: string) => {
    await addTimelineEntry(action, category, details);
  }, [addTimelineEntry]);

  const updateProfile = useCallback(async (displayName: string, email: string, avatarUrl?: string) => {
    dispatch({ type: 'UPDATE_PROFILE', displayName, email, avatarUrl });
    if (state.user) {
      await SupabaseDB.saveProfile(state.user.id, { 
        displayName, 
        avatarUrl: avatarUrl || state.user.avatarUrl 
      });
    }
  }, [state.user]);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addLog, addExpense, addFood, addSleep, addActivity,
      addFile, addReminder, addChatMessage, addListItem,
      addHealthMetrics, addTimeline, updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
