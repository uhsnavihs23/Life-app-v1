/**
 * AppContext - Global State Management
 * 
 * Central state store with Supabase integration support.
 * Data persists locally and can sync to cloud.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  User, DailyLogEntry, ExpenseEntry, FoodEntry,
  SleepEntry, ActivityEntry, FileAttachment, Reminder,
  ChatMessage, EntryTag, ListItem, HealthMetrics, ActivityTimeline,
} from '../models/types';
import { StorageService } from '../services/StorageService';

/** App state shape */
interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  darkMode: boolean;
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

/** Actions */
type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
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
  | { type: 'UPDATE_PROFILE'; displayName: string; email: string };

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  darkMode: false,
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
      return { ...state, user: { ...state.user, displayName: action.displayName, email: action.email } };
    default:
      return state;
  }
}

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
  addHealthMetrics: (data: Partial<HealthMetrics>) => void;
  addTimeline: (action: string, category: ActivityTimeline['category'], details: string, metadata?: Record<string, unknown>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    const saved = StorageService.load<Partial<AppState>>('app_state');
    if (saved) {
      dispatch({ type: 'LOAD_STATE', state: saved });
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (state.isLoggedIn) {
      StorageService.save('app_state', state);
    }
  }, [state]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  // Helper to add timeline entry
  const addTimelineEntry = useCallback((action: string, category: ActivityTimeline['category'], details: string, metadata?: Record<string, unknown>) => {
    dispatch({
      type: 'ADD_TIMELINE',
      entry: {
        id: uuid(),
        userId: state.user?.id || '',
        action,
        category,
        details,
        metadata,
        createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addLog = useCallback((text: string, tag: EntryTag) => {
    const entry: DailyLogEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      text,
      tag,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LOG', entry });
    addTimelineEntry('Added log entry', tag, text);
  }, [state.user, addTimelineEntry]);

  const addExpense = useCallback((amount: number, category: string, note: string) => {
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
    addTimelineEntry('Added expense', 'expense', `₹${amount} - ${category}${note ? ': ' + note : ''}`, { amount, category });
  }, [state.user, addTimelineEntry]);

  const addFood = useCallback((name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType'], protein?: number, carbs?: number, fat?: number) => {
    const entry: FoodEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      name,
      portionSize,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_FOOD', entry });
    addTimelineEntry('Added food', 'food', `${name} (${portionSize})${calories ? ' - ' + calories + ' cal' : ''}`, { name, calories, mealType });
  }, [state.user, addTimelineEntry]);

  const addSleep = useCallback((hours: number, quality: SleepEntry['quality'], bedTime?: string, wakeTime?: string) => {
    const entry: SleepEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      hours,
      quality,
      bedTime,
      wakeTime,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SLEEP', entry });
    addTimelineEntry('Added sleep record', 'sleep', `${hours}h - ${quality} quality`, { hours, quality });
  }, [state.user, addTimelineEntry]);

  const addActivity = useCallback((steps: number, distanceKm?: number, activeMinutes?: number, caloriesBurned?: number) => {
    const entry: ActivityEntry = {
      id: uuid(),
      userId: state.user?.id || '',
      steps,
      distanceKm,
      activeMinutes,
      caloriesBurned,
      date: new Date().toISOString().split('T')[0],
      source: 'manual',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ACTIVITY', entry });
    addTimelineEntry('Added activity', 'exercise', `${steps.toLocaleString()} steps${distanceKm ? ' - ' + distanceKm + ' km' : ''}`, { steps, distanceKm });
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
    addTimelineEntry('Uploaded file', 'file', fileName, { fileType });
  }, [state.user, addTimelineEntry]);

  const addReminder = useCallback((title: string, description: string, dateTime: string, isRecurring: boolean, recurrenceInterval?: Reminder['recurrenceInterval']) => {
    const reminder: Reminder = {
      id: uuid(),
      userId: state.user?.id || '',
      title,
      description,
      dateTime,
      isRecurring,
      recurrenceInterval,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_REMINDER', reminder });
    addTimelineEntry('Created reminder', 'reminder', title, { dateTime, isRecurring });
  }, [state.user, addTimelineEntry]);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      message: { id: uuid(), userId: state.user?.id || '', role, content, timestamp: new Date().toISOString() },
    });
  }, [state.user]);

  const addListItem = useCallback((listType: ListItem['listType'], title: string, note?: string, rating?: number, status: ListItem['status'] = 'completed') => {
    const item: ListItem = {
      id: uuid(),
      userId: state.user?.id || '',
      listType,
      title,
      note,
      rating,
      status,
      dateAdded: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_LIST_ITEM', item });
    addTimelineEntry(`Added to ${listType} list`, 'list', title, { listType, rating });
  }, [state.user, addTimelineEntry]);

  const addHealthMetrics = useCallback((data: Partial<HealthMetrics>) => {
    const metrics: HealthMetrics = {
      id: uuid(),
      userId: state.user?.id || '',
      date: new Date().toISOString().split('T')[0],
      ...data,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_HEALTH_METRICS', metrics });
    addTimelineEntry('Logged health metrics', 'health', `Mood: ${data.mood || 'N/A'}, Energy: ${data.energyLevel || 'N/A'}/10`, data);
  }, [state.user, addTimelineEntry]);

  const addTimeline = useCallback((action: string, category: ActivityTimeline['category'], details: string, metadata?: Record<string, unknown>) => {
    addTimelineEntry(action, category, details, metadata);
  }, [addTimelineEntry]);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addLog, addExpense, addFood, addSleep, addActivity,
      addFile, addReminder, addChatMessage, addListItem,
      addHealthMetrics, addTimeline,
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
