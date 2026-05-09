# LifeLog AI - iOS App

A personal life dashboard app built with SwiftUI for iOS.

## 🚀 Quick Start

### Prerequisites
- Mac with Xcode 15+ installed
- iPhone with iOS 16+
- Google account (for Gemini API & Sheets)

### Setup Steps

1. **Clone/Copy this project** into Xcode
2. **Get your API keys** (see below)
3. **Update `Config.swift`** with your keys
4. **Run on your device**

## 🔑 API Keys Setup

### Gemini API (Free)
1. Visit https://makersuite.google.com/app/apikey
2. Create an API key
3. Add to `Config.swift`

### Google Sheets (Free Backend)
1. Go to https://console.cloud.google.com
2. Create project → Enable Sheets API
3. Create Service Account → Download JSON key
4. Create a Google Sheet and share with service account email
5. Add Sheet ID to `Config.swift`

## 📁 Project Structure

```
Models/          - Data structures (User, Entries, etc.)
ViewModels/      - Business logic (MVVM pattern)
Views/           - SwiftUI screens and components
Services/        - API integrations (Gemini, Sheets, HealthKit)
Helpers/         - Utilities and extensions
```

## 🔌 Integrating Real APIs

### Gemini API Integration
In `Services/GeminiService.swift`, the `classifyLog()` and `search()` methods 
are ready to use. Just add your API key to `Config.swift`.

### Google Sheets Integration
The `GoogleSheetsService.swift` handles reading/writing to Sheets.
Each data type has its own sheet tab (Logs, Expenses, Food, etc.)

### HealthKit Integration
1. Enable HealthKit capability in Xcode
2. Add privacy descriptions to Info.plist
3. The `HealthKitService.swift` handles permissions and queries

## 📲 Running on Your iPhone (Free)

1. Connect iPhone via cable
2. Enable Developer Mode on iPhone
3. Select your iPhone in Xcode
4. Click Run (▶️)
5. Trust the developer certificate on iPhone

**Note:** Free provisioning expires every 7 days. Rebuild to continue.

## 🔒 Security Notes

- Never commit `Config.swift` with real API keys
- Add `Config.swift` to `.gitignore`
- Use Keychain for storing user credentials in production

## 📊 Google Sheets Structure

Create a Google Sheet with these tabs:
- `Users` - User profiles
- `Logs` - Daily journal entries  
- `Expenses` - Expense tracking
- `Food` - Food intake
- `Sleep` - Sleep records
- `Activity` - Steps/exercise
- `Files` - File metadata
- `Reminders` - Reminder list

## 🆓 Keeping It Free

| Service | Free Limit | Notes |
|---------|------------|-------|
| Gemini API | 15 req/min, 1M tokens/month | Plenty for personal use |
| Google Sheets | Unlimited | Perfect free database |
| Apple Dev (Personal) | Free | 7-day signing, your device only |
| iCloud (optional) | 5GB free | For file storage |

## 🛠 Future Enhancements

- [ ] Widget for quick logging
- [ ] Apple Watch app
- [ ] Siri Shortcuts integration
- [ ] iCloud sync
- [ ] Export to PDF reports

## 📝 License

Personal use. Modify freely for your own needs!
