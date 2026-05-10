/**
 * SupabaseService - Cloud Database & Authentication
 * 
 * Supabase provides:
 * - User authentication (email/password)
 * - Cloud database (PostgreSQL)
 * - Real-time sync
 * - Free tier: 500MB database, 50K monthly active users
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://supabase.com and create free account
 * 2. Create a new project
 * 3. Go to Settings → API
 * 4. Copy the Project URL and anon public key
 * 5. Set these as environment variables in Vercel:
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Authentication functions
export const SupabaseAuth = {
  async signUp(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not configured') };
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });
    
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const client = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not configured') };
    
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

  async resetPassword(email: string) {
    const client = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not configured') };
    
    const { error } = await client.auth.resetPasswordForEmail(email);
    return { error };
  },
};

// Database functions
export const SupabaseDB = {
  async saveData(table: string, data: Record<string, unknown>) {
    const client = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not configured') };
    
    const { error } = await client.from(table).upsert(data);
    return { error };
  },

  async getData(table: string, userId: string) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };
    
    const column = table === 'profiles' ? 'id' : 'user_id';
    
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq(column, userId);
    
    return { data, error };
  },

  async deleteData(table: string, id: string) {
    const client = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not configured') };
    
    const { error } = await client.from(table).delete().eq('id', id);
    return { error };
  },
};

/**
 * SQL to create tables in Supabase (run in SQL Editor):
 * 
 * -- Users profile extension
 * CREATE TABLE profiles (
 *   id UUID REFERENCES auth.users PRIMARY KEY,
 *   display_name TEXT,
 *   avatar_url TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Daily logs
 * CREATE TABLE daily_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   text TEXT NOT NULL,
 *   tag TEXT NOT NULL,
 *   classified_data JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Expenses
 * CREATE TABLE expenses (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   amount DECIMAL NOT NULL,
 *   currency TEXT DEFAULT 'INR',
 *   category TEXT NOT NULL,
 *   note TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Food entries
 * CREATE TABLE food_entries (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   name TEXT NOT NULL,
 *   portion_size TEXT,
 *   calories INTEGER,
 *   protein INTEGER,
 *   carbs INTEGER,
 *   fat INTEGER,
 *   meal_type TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Sleep entries
 * CREATE TABLE sleep_entries (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   hours DECIMAL NOT NULL,
 *   quality TEXT NOT NULL,
 *   bed_time TIME,
 *   wake_time TIME,
 *   date DATE NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Activities
 * CREATE TABLE activities (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   steps INTEGER NOT NULL,
 *   distance_km DECIMAL,
 *   active_minutes INTEGER,
 *   calories_burned INTEGER,
 *   date DATE NOT NULL,
 *   source TEXT DEFAULT 'manual',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- List items (movies, books, etc.)
 * CREATE TABLE list_items (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   list_type TEXT NOT NULL,
 *   title TEXT NOT NULL,
 *   note TEXT,
 *   rating INTEGER,
 *   status TEXT DEFAULT 'completed',
 *   date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   date_completed TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Health metrics
 * CREATE TABLE health_metrics (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   date DATE NOT NULL,
 *   weight DECIMAL,
 *   water_intake INTEGER,
 *   mood TEXT,
 *   energy_level INTEGER,
 *   stress_level INTEGER,
 *   notes TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Activity timeline
 * CREATE TABLE activity_timeline (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   action TEXT NOT NULL,
 *   category TEXT NOT NULL,
 *   details TEXT,
 *   metadata JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Reminders
 * CREATE TABLE reminders (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES auth.users NOT NULL,
 *   title TEXT NOT NULL,
 *   description TEXT,
 *   date_time TIMESTAMP WITH TIME ZONE NOT NULL,
 *   is_recurring BOOLEAN DEFAULT FALSE,
 *   recurrence_interval TEXT,
 *   is_completed BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Enable Row Level Security
 * ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
 * 
 * -- Create policies (users can only see their own data)
 * CREATE POLICY "Users can view own data" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
 * CREATE POLICY "Users can insert own data" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
 * -- Repeat for all tables...
 */
