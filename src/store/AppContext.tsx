/**
 * AppContext - Global State Management
 * 
 * This is the central state store for the entire app.
 * It replaces what would be @Published properties in SwiftUI ViewModels.
 * 
 * All data is persisted to localStorage via StorageService.
 * State changes trigger re-renders via React Context.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  User, DailyLogEntry, ExpenseEntry, FoodEntry,
  SleepEntry, ActivityEntry, FileAttachment, Reminder,
  ChatMessage, EntryTag,
} from '../models/types';
import { StorageService } from '../services/StorageService';

/** Shape of the entire app state */
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
}

/** Actions that can modify state */
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
  // Convenience action creators
  addLog: (text: string, tag: EntryTag) => void;
  addExpense: (amount: number, category: string, note: string) => void;
  addFood: (name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType']) => void;
  addSleep: (hours: number, quality: SleepEntry['quality']) => void;
  addActivity: (steps: number, distanceKm?: number) => void;
  addFile: (fileName: string, fileType: 'pdf' | 'image', localUrl: string) => void;
  addReminder: (title: string, description: string, dateTime: string, isRecurring: boolean, recurrenceInterval?: Reminder['recurrenceInterval']) => void;
  addChatMessage: (role: ChatMessage['role'], content: string) => void;
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

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  const addLog = useCallback((text: string, tag: EntryTag) => {
    dispatch({
      type: 'ADD_LOG',
      entry: {
        id: uuid(), userId: state.user?.id || '', text, tag,
        createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addExpense = useCallback((amount: number, category: string, note: string) => {
    dispatch({
      type: 'ADD_EXPENSE',
      entry: {
        id: uuid(), userId: state.user?.id || '', amount, currency: 'USD',
        category, note, createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addFood = useCallback((name: string, portionSize: string, calories: number | undefined, mealType: FoodEntry['mealType']) => {
    dispatch({
      type: 'ADD_FOOD',
      entry: {
        id: uuid(), userId: state.user?.id || '', name, portionSize,
        calories, mealType, createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addSleep = useCallback((hours: number, quality: SleepEntry['quality']) => {
    dispatch({
      type: 'ADD_SLEEP',
      entry: {
        id: uuid(), userId: state.user?.id || '', hours, quality,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addActivity = useCallback((steps: number, distanceKm?: number) => {
    dispatch({
      type: 'ADD_ACTIVITY',
      entry: {
        id: uuid(), userId: state.user?.id || '', steps, distanceKm,
        date: new Date().toISOString().split('T')[0],
        source: 'manual', createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addFile = useCallback((fileName: string, fileType: 'pdf' | 'image', localUrl: string) => {
    dispatch({
      type: 'ADD_FILE',
      file: {
        id: uuid(), userId: state.user?.id || '', fileName, fileType,
        localUrl, createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addReminder = useCallback((title: string, description: string, dateTime: string, isRecurring: boolean, recurrenceInterval?: Reminder['recurrenceInterval']) => {
    dispatch({
      type: 'ADD_REMINDER',
      reminder: {
        id: uuid(), userId: state.user?.id || '', title, description,
        dateTime, isRecurring, recurrenceInterval, isCompleted: false,
        createdAt: new Date().toISOString(),
      },
    });
  }, [state.user]);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      message: { id: uuid(), role, content, timestamp: new Date().toISOString() },
    });
  }, []);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      addLog, addExpense, addFood, addSleep, addActivity,
      addFile, addReminder, addChatMessage,
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
