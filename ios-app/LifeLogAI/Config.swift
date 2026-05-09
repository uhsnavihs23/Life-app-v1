//
//  Config.swift
//  LifeLogAI
//
//  ⚠️ IMPORTANT: Add this file to .gitignore!
//  This contains your API keys and should never be committed to version control.
//
//  HOW TO GET YOUR KEYS:
//  1. Gemini API: https://makersuite.google.com/app/apikey
//  2. Google Sheets: https://console.cloud.google.com (create service account)
//

import Foundation

enum Config {
    // MARK: - Gemini API
    // Get your free key at: https://makersuite.google.com/app/apikey
    static let geminiAPIKey = "YOUR_GEMINI_API_KEY_HERE"
    static let geminiModel = "gemini-1.5-flash"  // Free tier model
    static let geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta"
    
    // MARK: - Google Sheets (Free Backend)
    // 1. Create a Google Cloud project
    // 2. Enable Google Sheets API
    // 3. Create a service account and download JSON key
    // 4. Create a Google Sheet and share with service account email
    static let googleSheetsID = "YOUR_GOOGLE_SHEET_ID_HERE"
    static let googleServiceAccountEmail = "YOUR_SERVICE_ACCOUNT_EMAIL"
    // Paste the contents of your service account JSON key here
    static let googleServiceAccountKey = """
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
      "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
      "client_id": "...",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
    """
    
    // MARK: - App Settings
    static let appName = "LifeLog AI"
    static let appVersion = "1.0.0"
    
    // Default expense categories
    static let expenseCategories = [
        "Food & Dining",
        "Transportation",
        "Shopping",
        "Bills & Utilities",
        "Entertainment",
        "Healthcare",
        "Education",
        "Other"
    ]
    
    // Meal types for food logging
    static let mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"]
    
    // Sleep quality options
    static let sleepQualities = ["Poor", "Fair", "Good", "Excellent"]
}
