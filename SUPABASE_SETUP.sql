-- ================================================
-- LIFELOG AI - SUPABASE DATABASE SETUP
-- ================================================
-- 
-- HOW TO USE:
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste ALL of this SQL
-- 5. Click "Run" (or press Ctrl+Enter)
-- 6. Wait for it to complete
-- 7. You're done! Your database is ready.
--
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ TABLES ============

-- Daily logs (journal entries)
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  tag TEXT NOT NULL,
  classified_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses (in INR)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  category TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food entries
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  portion_size TEXT,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep entries
CREATE TABLE IF NOT EXISTS sleep_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  hours DECIMAL NOT NULL,
  quality TEXT NOT NULL,
  bed_time TIME,
  wake_time TIME,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities (steps, distance)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  steps INTEGER NOT NULL,
  distance_km DECIMAL,
  active_minutes INTEGER,
  calories_burned INTEGER,
  date DATE NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- List items (movies, music, books, etc.)
CREATE TABLE IF NOT EXISTS list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  list_type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  rating INTEGER,
  status TEXT DEFAULT 'completed',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_completed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health metrics
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL,
  water_intake INTEGER,
  mood TEXT,
  energy_level INTEGER,
  stress_level INTEGER,
  symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health profiles (persistent user body data)
CREATE TABLE IF NOT EXISTS health_profiles (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  height_cm DECIMAL,
  weight_kg DECIMAL,
  age INTEGER,
  gender TEXT,
  activity_level TEXT,
  medical_conditions TEXT,
  allergies TEXT,
  diet_preference TEXT,
  fitness_goal TEXT,
  daily_calorie_target INTEGER,
  daily_protein_target INTEGER,
  daily_steps_target INTEGER,
  daily_water_target INTEGER,
  daily_sleep_target DECIMAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity timeline (logs EVERYTHING)
CREATE TABLE IF NOT EXISTS activity_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_interval TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ ROW LEVEL SECURITY (RLS) ============
-- This ensures each user can ONLY see their own data

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- Users can only access their own data

-- Daily Logs
CREATE POLICY "Users can view own logs" ON daily_logs 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON daily_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON daily_logs 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON daily_logs 
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses
CREATE POLICY "Users can view own expenses" ON expenses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses 
  FOR DELETE USING (auth.uid() = user_id);

-- Food entries
CREATE POLICY "Users can view own food" ON food_entries 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food" ON food_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food" ON food_entries 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food" ON food_entries 
  FOR DELETE USING (auth.uid() = user_id);

-- Sleep entries
CREATE POLICY "Users can view own sleep" ON sleep_entries 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep" ON sleep_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sleep" ON sleep_entries 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep" ON sleep_entries 
  FOR DELETE USING (auth.uid() = user_id);

-- Activities
CREATE POLICY "Users can view own activities" ON activities 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON activities 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON activities 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON activities 
  FOR DELETE USING (auth.uid() = user_id);

-- List items
CREATE POLICY "Users can view own list items" ON list_items 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own list items" ON list_items 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own list items" ON list_items 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own list items" ON list_items 
  FOR DELETE USING (auth.uid() = user_id);

-- Health metrics
CREATE POLICY "Users can view own health" ON health_metrics 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health" ON health_metrics 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health" ON health_metrics 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own health" ON health_metrics 
  FOR DELETE USING (auth.uid() = user_id);

-- Activity timeline
CREATE POLICY "Users can view own timeline" ON activity_timeline 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own timeline" ON activity_timeline 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own timeline" ON activity_timeline 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own timeline" ON activity_timeline 
  FOR DELETE USING (auth.uid() = user_id);

-- Health Profiles
CREATE POLICY "Users can view own health profile" ON health_profiles 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health profile" ON health_profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health profile" ON health_profiles 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own health profile" ON health_profiles 
  FOR DELETE USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can view own reminders" ON reminders 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON reminders 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON reminders 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON reminders 
  FOR DELETE USING (auth.uid() = user_id);

-- ============ INDEXES FOR PERFORMANCE ============

CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_created ON daily_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_user ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_user ON sleep_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_user ON list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_health_user ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_user ON activity_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created ON activity_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

-- ============ DONE! ============
-- Your database is now set up.
-- 
-- NEXT STEPS:
-- 1. Go to Authentication > Providers > Email
-- 2. Turn OFF "Confirm email" for easier testing
-- 3. Deploy your app and test!
