# LifeLog AI - Complete Setup Guide

## 🎯 What's Been Built

Your app now includes:
- ✅ **Today Tab**: Log anything - expenses (₹), food, sleep, steps, health, movies/music/books
- ✅ **Dashboard**: Deep health insights, AI suggestions, charts for sleep & steps
- ✅ **History Tab**: View all past records by date or all-time
- ✅ **Lists Tab**: Track movies, music, books, podcasts, TV shows, games
- ✅ **Reminders**: With notifications
- ✅ **AI Search**: Ask questions about your data
- ✅ **Profile**: Settings, API key management, dark mode
- ✅ **Activity Timeline**: Every action is recorded with timestamp
- ✅ **INR Currency**: All amounts in ₹
- ✅ **Dynamic Island Fix**: Safe area padding for iPhone 15+
- ✅ **PWA Support**: Install as app on iPhone

---

## 🔐 Security: Is the API Key Safe?

### Current Approach (Good for Personal Use)
The API key is stored in your browser's localStorage:
- ✅ Only accessible on YOUR device
- ✅ Not sent to any server except Google (for AI requests)
- ✅ Cleared when you clear browser data
- ⚠️ Anyone with physical access to your phone could see it

### Better Approach (For Production/Multi-User)
Use Vercel environment variables:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add: `VITE_GEMINI_API_KEY` = your-api-key
4. Redeploy

This way the key is server-side and never exposed to browsers.

---

## 🔑 Setting Up Rolling Gemini API Keys

You can create multiple API keys and rotate them:

### Step 1: Create Multiple Keys
1. Go to https://makersuite.google.com/app/apikey
2. Create 2-3 API keys
3. Save them somewhere safe

### Step 2: Set Up Key Rotation (Optional)
For now, just add one key. If it gets exhausted (very unlikely for personal use):
1. Go to Profile → Update API Key
2. Paste a new key

### Free Tier Limits (Very Generous)
- **15 requests per minute**
- **1 million tokens per month**
- **For personal use, this is MORE than enough**

Even with heavy OCR use, you won't hit these limits for personal use.

---

## 🔐 Setting Up Custom Login (Supabase)

To have proper login with your own credentials:

### Step 1: Create Supabase Project (Free)

1. Go to https://supabase.com
2. Sign up (free)
3. Create a new project (name it "LifeLog")
4. Wait for it to initialize (~2 minutes)

### Step 2: Get Your Keys

1. In Supabase dashboard → Settings → API
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 3: Add to Vercel

1. Go to your Vercel project → Settings → Environment Variables
2. Add these variables:
   ```
   VITE_SUPABASE_URL = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...your-key...
   ```
3. Redeploy

### Step 4: Create Database Tables

In Supabase → SQL Editor, run this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily logs
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  category TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food entries
CREATE TABLE food_entries (
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
CREATE TABLE sleep_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  hours DECIMAL NOT NULL,
  quality TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  steps INTEGER NOT NULL,
  distance_km DECIMAL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- List items (movies, books, etc.)
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  list_type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  rating INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health metrics
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  mood TEXT,
  energy_level INTEGER,
  water_intake INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity timeline
CREATE TABLE activity_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminders
CREATE TABLE reminders (
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

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see their own data)
CREATE POLICY "Users can view own logs" ON daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own food" ON food_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sleep" ON sleep_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own activities" ON activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own lists" ON list_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own health" ON health_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own timeline" ON activity_timeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);
```

### Step 5: Enable Email Auth

1. In Supabase → Authentication → Providers
2. Make sure "Email" is enabled
3. Go to Authentication → URL Configuration
4. Add your Vercel URL to "Redirect URLs"

Now you have proper multi-user authentication!

---

## 📱 Fixing Dynamic Island on iPhone 15

Already fixed in the code! The CSS uses:
```css
body {
  padding-top: env(safe-area-inset-top);
}
.safe-area-top {
  padding-top: max(env(safe-area-inset-top), 20px);
}
```

---

## 💰 All Currency Now in INR (₹)

All expense displays now show ₹ instead of $. The `formatINR()` function handles this automatically.

---

## 📊 New Features Added

### 1. History Tab
- View activities by specific date
- Or see all-time history
- Filter by category (expenses, food, sleep, etc.)
- Search through your records
- See daily summaries

### 2. Lists Tab
- Movies 🎬
- Music 🎵
- Books 📚
- Podcasts 🎙️
- TV Shows 📺
- Games 🎮
- Add ratings (1-5 stars)
- Track status (completed, in progress, want to)

### 3. Health Tracking
- Mood (great/good/okay/low/bad)
- Energy level (1-10)
- Water intake (glasses)
- Deep insights in Dashboard

### 4. Activity Timeline
Every single action is now recorded:
- What you did
- When you did it
- Category
- All searchable and viewable in History tab

### 5. Deep Health Insights
Dashboard now shows:
- Sleep quality analysis
- Step goals progress
- Calorie tracking feedback
- Hydration reminders
- Mood tracking
- AI-powered suggestions (with Gemini API)

---

## 🚀 Deployment Checklist

### For GitHub + Vercel:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update with all features"
   git push
   ```

2. **Vercel Auto-Deploys**
   - Go to vercel.com
   - Check your deployment
   - Should auto-build

3. **Add Environment Variables** (if using Supabase)
   - Vercel → Your Project → Settings → Environment Variables
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Redeploy

4. **Test on iPhone**
   - Open Safari → your-app.vercel.app
   - Add to Home Screen
   - Test all features

---

## 🔄 Sharing with Friends (Multi-User)

Once Supabase is set up:
1. Share your Vercel URL with friends
2. They sign up with their email/password
3. Each person has completely separate data
4. Row Level Security ensures privacy

---

## 📝 Summary of What You Asked For

| Request | Status |
|---------|--------|
| API key security | ✅ Local storage + env vars option |
| Dynamic Island fix | ✅ Safe area insets |
| INR currency (₹) | ✅ All amounts |
| Custom login | ✅ With Supabase guide |
| View past records | ✅ History tab |
| Activity log with timestamps | ✅ Activity Timeline |
| Deep health insights | ✅ Dashboard + AI |
| Movies/music/books lists | ✅ Lists tab |
| Multi-user support | ✅ With Supabase + RLS |

---

## 🆓 Costs Summary

| Service | Cost | Limits |
|---------|------|--------|
| Vercel Hosting | FREE | Unlimited |
| Gemini API | FREE | 15 req/min, 1M tokens/month |
| Supabase | FREE | 500MB database, 50K users |
| Total | **₹0** | Perfect for personal use |

---

## 🎉 You're All Set!

Your LifeLog AI is now a complete life tracking system:
- Log everything about your day
- Track expenses in ₹
- Monitor health metrics
- Keep lists of entertainment
- Get AI-powered insights
- View your entire history
- All for FREE, forever!

Enjoy your personal life dashboard! 🚀
