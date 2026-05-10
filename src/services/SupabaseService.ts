/**
 * SupabaseService - Cloud Database & Authentication
 * 
 * Handles:
 * - User authentication (email/password)
 * - Data sync to cloud
 * - Real-time data persistence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyLogEntry, ExpenseEntry, FoodEntry, SleepEntry,
  ActivityEntry, Reminder, ListItem, HealthMetrics, ActivityTimeline
} from '../models/types';

// Get from environment variables (set in Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase not configured - using local storage only');
    return null;
  }
  
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase'));
}

// ============ AUTHENTICATION ============

export const SupabaseAuth = {
  async signUp(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });
    
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  },

  async signOut() {
    const client = getSupabaseClient();
    if (!client) return { error: null };
    
    const { error } = await client.auth.signOut();
    return { error };
  },

  async getUser() {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data: { user } } = await client.auth.getUser();
    return user;
  },
};

// ============ DATA SYNC ============

export const SupabaseDB = {
  // ---- Daily Logs ----
  async saveDailyLog(entry: DailyLogEntry) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('daily_logs').upsert({
      id: entry.id,
      user_id: entry.userId,
      text: entry.text,
      tag: entry.tag,
      classified_data: entry.classifiedData,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving log:', error);
  },

  async getDailyLogs(userId: string): Promise<DailyLogEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      text: row.text,
      tag: row.tag,
      classifiedData: row.classified_data,
      createdAt: row.created_at,
    }));
  },

  // ---- Expenses ----
  async saveExpense(entry: ExpenseEntry) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('expenses').upsert({
      id: entry.id,
      user_id: entry.userId,
      amount: entry.amount,
      currency: entry.currency,
      category: entry.category,
      note: entry.note,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving expense:', error);
  },

  async getExpenses(userId: string): Promise<ExpenseEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      currency: row.currency || 'INR',
      category: row.category,
      note: row.note || '',
      createdAt: row.created_at,
    }));
  },

  // ---- Food Entries ----
  async saveFood(entry: FoodEntry) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('food_entries').upsert({
      id: entry.id,
      user_id: entry.userId,
      name: entry.name,
      portion_size: entry.portionSize,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      meal_type: entry.mealType,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving food:', error);
  },

  async getFoodEntries(userId: string): Promise<FoodEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching food:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      portionSize: row.portion_size || '1 serving',
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      mealType: row.meal_type,
      createdAt: row.created_at,
    }));
  },

  // ---- Sleep Entries ----
  async saveSleep(entry: SleepEntry) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('sleep_entries').upsert({
      id: entry.id,
      user_id: entry.userId,
      hours: entry.hours,
      quality: entry.quality,
      bed_time: entry.bedTime,
      wake_time: entry.wakeTime,
      date: entry.date,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving sleep:', error);
  },

  async getSleepEntries(userId: string): Promise<SleepEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('sleep_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching sleep:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      hours: row.hours,
      quality: row.quality,
      bedTime: row.bed_time,
      wakeTime: row.wake_time,
      date: row.date,
      createdAt: row.created_at,
    }));
  },

  // ---- Activities ----
  async saveActivity(entry: ActivityEntry) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('activities').upsert({
      id: entry.id,
      user_id: entry.userId,
      steps: entry.steps,
      distance_km: entry.distanceKm,
      active_minutes: entry.activeMinutes,
      calories_burned: entry.caloriesBurned,
      date: entry.date,
      source: entry.source,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving activity:', error);
  },

  async getActivities(userId: string): Promise<ActivityEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      steps: row.steps,
      distanceKm: row.distance_km,
      activeMinutes: row.active_minutes,
      caloriesBurned: row.calories_burned,
      date: row.date,
      source: row.source || 'manual',
      createdAt: row.created_at,
    }));
  },

  // ---- Reminders ----
  async saveReminder(entry: Reminder) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('reminders').upsert({
      id: entry.id,
      user_id: entry.userId,
      title: entry.title,
      description: entry.description,
      date_time: entry.dateTime,
      is_recurring: entry.isRecurring,
      recurrence_interval: entry.recurrenceInterval,
      is_completed: entry.isCompleted,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving reminder:', error);
  },

  async getReminders(userId: string): Promise<Reminder[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('date_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description || '',
      dateTime: row.date_time,
      isRecurring: row.is_recurring,
      recurrenceInterval: row.recurrence_interval,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
    }));
  },

  async deleteReminder(id: string) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('reminders').delete().eq('id', id);
    if (error) console.error('Error deleting reminder:', error);
  },

  async updateReminderStatus(id: string, isCompleted: boolean) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client
      .from('reminders')
      .update({ is_completed: isCompleted })
      .eq('id', id);
    
    if (error) console.error('Error updating reminder:', error);
  },

  // ---- List Items ----
  async saveListItem(item: ListItem) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('list_items').upsert({
      id: item.id,
      user_id: item.userId,
      list_type: item.listType,
      title: item.title,
      note: item.note,
      rating: item.rating,
      status: item.status,
      date_added: item.dateAdded,
      date_completed: item.dateCompleted,
      created_at: item.createdAt,
    });
    
    if (error) console.error('Error saving list item:', error);
  },

  async getListItems(userId: string): Promise<ListItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('list_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching list items:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      listType: row.list_type,
      title: row.title,
      note: row.note,
      rating: row.rating,
      status: row.status,
      dateAdded: row.date_added,
      dateCompleted: row.date_completed,
      createdAt: row.created_at,
    }));
  },

  async deleteListItem(id: string) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('list_items').delete().eq('id', id);
    if (error) console.error('Error deleting list item:', error);
  },

  // ---- Health Metrics ----
  async saveHealthMetrics(metrics: HealthMetrics) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('health_metrics').upsert({
      id: metrics.id,
      user_id: metrics.userId,
      date: metrics.date,
      weight: metrics.weight,
      water_intake: metrics.waterIntake,
      mood: metrics.mood,
      energy_level: metrics.energyLevel,
      stress_level: metrics.stressLevel,
      notes: metrics.notes,
      created_at: metrics.createdAt,
    });
    
    if (error) console.error('Error saving health metrics:', error);
  },

  async getHealthMetrics(userId: string): Promise<HealthMetrics[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching health metrics:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      date: row.date,
      weight: row.weight,
      waterIntake: row.water_intake,
      mood: row.mood,
      energyLevel: row.energy_level,
      stressLevel: row.stress_level,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  },

  // ---- Activity Timeline ----
  async saveTimeline(entry: ActivityTimeline) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('activity_timeline').upsert({
      id: entry.id,
      user_id: entry.userId,
      action: entry.action,
      category: entry.category,
      details: entry.details,
      metadata: entry.metadata,
      created_at: entry.createdAt,
    });
    
    if (error) console.error('Error saving timeline:', error);
  },

  async getTimeline(userId: string): Promise<ActivityTimeline[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    
    const { data, error } = await client
      .from('activity_timeline')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500); // Limit to last 500 entries
    
    if (error) {
      console.error('Error fetching timeline:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      category: row.category,
      details: row.details,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  },

  // ---- Load ALL data for a user ----
  async loadAllData(userId: string) {
    const [
      dailyLogs,
      expenses,
      foodEntries,
      sleepEntries,
      activities,
      reminders,
      listItems,
      healthMetrics,
      activityTimeline,
    ] = await Promise.all([
      this.getDailyLogs(userId),
      this.getExpenses(userId),
      this.getFoodEntries(userId),
      this.getSleepEntries(userId),
      this.getActivities(userId),
      this.getReminders(userId),
      this.getListItems(userId),
      this.getHealthMetrics(userId),
      this.getTimeline(userId),
    ]);

    return {
      dailyLogs,
      expenses,
      foodEntries,
      sleepEntries,
      activities,
      reminders,
      listItems,
      healthMetrics,
      activityTimeline,
    };
  },

  // ============ PROFILES ============

  async saveProfile(userId: string, data: { displayName?: string, avatarUrl?: string }) {
    const client = getSupabaseClient();
    if (!client) return;
    
    const { error } = await client.from('profiles').upsert({
      id: userId,
      display_name: data.displayName,
      avatar_url: data.avatarUrl,
      updated_at: new Date().toISOString(),
    });
    
    if (error) console.error('Error saving profile:', error);
  },

  async getProfile(userId: string) {
    const client = getSupabaseClient();
    if (!client) return null;
    
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data ? {
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
    } : null;
  },
};
