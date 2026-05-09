# LifeLog AI - Complete Setup Guide

## 🎉 Your App is Ready!

This is your personal AI-powered life dashboard. It's a Progressive Web App (PWA) that works like a native app on your iPhone - **completely free, forever**.

---

## 📱 Step 1: Deploy Your App (5 minutes)

### Option A: Deploy to Vercel (Recommended - Easiest)

1. **Create a GitHub account** (if you don't have one)
   - Go to https://github.com
   - Sign up for free

2. **Create a Vercel account**
   - Go to https://vercel.com
   - Click "Sign Up" → "Continue with GitHub"

3. **Upload your code to GitHub**
   - Create a new repository on GitHub
   - Upload all the files from this project

4. **Deploy on Vercel**
   - In Vercel dashboard, click "New Project"
   - Select your GitHub repository
   - Click "Deploy"
   - Wait 1-2 minutes

5. **Your app is live!**
   - Vercel gives you a URL like: `https://your-app.vercel.app`
   - This is your permanent app URL

### Option B: Deploy to Netlify (Alternative)

1. Go to https://netlify.com
2. Sign up with GitHub
3. Drag and drop the `dist` folder
4. Done! You get a URL instantly

---

## 📲 Step 2: Install on iPhone (2 minutes)

1. **Open Safari** on your iPhone
2. **Go to your app URL** (from Vercel/Netlify)
3. **Tap the Share button** (square with arrow pointing up)
4. **Scroll down and tap "Add to Home Screen"**
5. **Name it "LifeLog AI"** and tap "Add"

**Done!** You now have LifeLog AI on your home screen like a real app!

---

## 🤖 Step 3: Enable AI Features (3 minutes)

### Get Your Free Gemini API Key

1. **Go to** https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Create API Key"**
4. **Copy the key** (it looks like: `AIzaSy...`)

### Add Key to Your App

1. **Open LifeLog AI** on your iPhone
2. **Go to Profile tab** (last tab)
3. **Tap "Add API Key"**
4. **Paste your key** and tap Save

**AI features are now enabled!** 🎉

---

## 🆓 What's Free Forever

| Feature | Free Limit |
|---------|------------|
| **Hosting (Vercel)** | Unlimited |
| **Gemini AI** | 15 requests/min, 1M tokens/month |
| **Storage** | On your device (unlimited) |
| **Updates** | Just deploy again |

The free tier is MORE than enough for personal use.

---

## ✨ What Your App Can Do

### Today Tab
- Write daily journal entries
- AI auto-classifies your entries (expense/food/sleep/exercise)
- Quick-add buttons for:
  - 💰 Expenses (amount, category)
  - 🍽️ Food (name, calories)
  - 😴 Sleep (hours, quality)
  - 🏃 Activity (steps, distance)
- See today's activity feed

### Dashboard Tab
- Total expenses (today & this week)
- Food/meals summary
- Sleep chart (last 7 days)
- Steps chart (last 7 days)
- AI-generated insights

### Files Tab
- Upload images of receipts/bills
- Take photos directly
- AI OCR extracts text from images
- Organize your documents

### Reminders Tab
- Create reminders with date/time
- Set recurring reminders (daily/weekly/monthly)
- Get notifications when due

### AI Search Tab
- Ask questions about your data
- "How much did I spend this week?"
- "How is my sleep pattern?"
- "Summarize my food intake"
- General knowledge questions

### Profile Tab
- Edit your profile
- Add/update Gemini API key
- Dark mode toggle
- Clear data / logout

---

## 🔄 How to Update Your App

When you make changes:

1. Make your code changes
2. Run `npm run build`
3. Push to GitHub (Vercel auto-deploys)
   OR drag `dist` folder to Netlify

Your iPhone app updates automatically!

---

## 💾 Your Data

- **Stored locally** on your device
- **Never sent to any server** (except Gemini for AI features)
- **Persists forever** (until you clear browser data)
- **Private and secure**

---

## 🛠️ Future Improvements You Can Add

1. **Cloud Backup**
   - Add Supabase (free tier) for cloud sync
   - Your data syncs across devices

2. **Export Data**
   - Export to CSV/PDF
   - Backup to Google Drive

3. **More AI Features**
   - Weekly/monthly reports
   - Spending predictions
   - Health recommendations

4. **Widgets** (if you later build native)
   - Quick logging from home screen

---

## ❓ FAQ

### Does this work offline?
Yes! Basic features work offline. AI features need internet.

### Can I use this on Android?
Yes! Same process - open in Chrome, "Add to Home Screen"

### Is my data really private?
Yes. Data stays on YOUR device. Gemini only sees what you ask it.

### What if I lose my phone?
Data is on the device. For backup, consider adding Supabase later.

### Can I share this with family?
Yes! They each get their own local data on their devices.

---

## 🎯 Quick Start Checklist

- [ ] Deploy to Vercel or Netlify
- [ ] Add to iPhone home screen
- [ ] Get Gemini API key
- [ ] Add API key in Profile → Settings
- [ ] Start logging your first entry!

---

## 🆘 Need Help?

- **Vercel docs**: https://vercel.com/docs
- **Gemini API docs**: https://ai.google.dev/docs
- **PWA guide**: https://web.dev/progressive-web-apps/

---

**Enjoy your free, permanent, AI-powered life dashboard! 🚀**
