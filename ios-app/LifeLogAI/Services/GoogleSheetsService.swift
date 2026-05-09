//
//  GoogleSheetsService.swift
//  LifeLogAI
//
//  Syncs data to Google Sheets for free cloud backup.
//  This gives you a free "database" that you can also view/edit in a browser.
//
//  SETUP:
//  1. Create a Google Cloud project
//  2. Enable Google Sheets API
//  3. Create a service account
//  4. Download the JSON key
//  5. Create a Google Sheet and share it with the service account email
//  6. Add the sheet ID and key to Config.swift
//
//  SHEET STRUCTURE:
//  Create tabs named: Logs, Expenses, Food, Sleep, Activity, Files, Reminders
//  First row of each tab should be headers matching the model properties
//

import Foundation

class GoogleSheetsService {
    static let shared = GoogleSheetsService()
    
    private let sheetId = Config.googleSheetsID
    private let baseURL = "https://sheets.googleapis.com/v4/spreadsheets"
    
    private var accessToken: String?
    private var tokenExpiry: Date?
    
    private init() {}
    
    // MARK: - Authentication
    
    /// Get OAuth access token from service account credentials
    private func getAccessToken() async throws -> String {
        // If we have a valid token, use it
        if let token = accessToken, let expiry = tokenExpiry, expiry > Date() {
            return token
        }
        
        // Parse service account credentials
        guard let keyData = Config.googleServiceAccountKey.data(using: .utf8),
              let credentials = try? JSONSerialization.jsonObject(with: keyData) as? [String: Any],
              let clientEmail = credentials["client_email"] as? String,
              let privateKey = credentials["private_key"] as? String else {
            throw SheetsError.invalidCredentials
        }
        
        // Create JWT for service account auth
        let jwt = try createJWT(clientEmail: clientEmail, privateKey: privateKey)
        
        // Exchange JWT for access token
        let tokenURL = URL(string: "https://oauth2.googleapis.com/token")!
        var request = URLRequest(url: tokenURL)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let body = "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=\(jwt)"
        request.httpBody = body.data(using: .utf8)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["access_token"] as? String,
              let expiresIn = json["expires_in"] as? Int else {
            throw SheetsError.authFailed
        }
        
        accessToken = token
        tokenExpiry = Date().addingTimeInterval(TimeInterval(expiresIn - 60))
        
        return token
    }
    
    /// Create a JWT for Google OAuth (simplified - in production use a proper JWT library)
    private func createJWT(clientEmail: String, privateKey: String) throws -> String {
        // This is a simplified implementation
        // For production, use a library like SwiftJWT
        
        let header = ["alg": "RS256", "typ": "JWT"]
        let now = Int(Date().timeIntervalSince1970)
        let claims: [String: Any] = [
            "iss": clientEmail,
            "scope": "https://www.googleapis.com/auth/spreadsheets",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now,
            "exp": now + 3600
        ]
        
        let headerData = try JSONSerialization.data(withJSONObject: header)
        let claimsData = try JSONSerialization.data(withJSONObject: claims)
        
        let headerB64 = headerData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        let claimsB64 = claimsData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        
        // Note: Actual RS256 signing requires Security framework
        // This is a placeholder - use SwiftJWT or similar in production
        let signature = "placeholder_signature"
        
        return "\(headerB64).\(claimsB64).\(signature)"
    }
    
    // MARK: - Read Data
    
    /// Read data from a sheet tab
    func readSheet(tab: String, range: String = "A:Z") async throws -> [[String]] {
        guard sheetId != "YOUR_GOOGLE_SHEET_ID_HERE" else {
            print("GoogleSheetsService: Sheet ID not configured")
            return []
        }
        
        let token = try await getAccessToken()
        let urlString = "\(baseURL)/\(sheetId)/values/\(tab)!\(range)"
        
        guard let url = URL(string: urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? urlString) else {
            throw SheetsError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let values = json["values"] as? [[String]] else {
            return []
        }
        
        return values
    }
    
    // MARK: - Write Data
    
    /// Append a row to a sheet tab
    func appendRow(tab: String, values: [String]) async throws {
        guard sheetId != "YOUR_GOOGLE_SHEET_ID_HERE" else {
            print("GoogleSheetsService: Sheet ID not configured, saving locally only")
            return
        }
        
        let token = try await getAccessToken()
        let urlString = "\(baseURL)/\(sheetId)/values/\(tab)!A:Z:append?valueInputOption=RAW"
        
        guard let url = URL(string: urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? urlString) else {
            throw SheetsError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["values": [values]]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw SheetsError.writeFailed
        }
    }
    
    // MARK: - Sync Methods
    
    /// Sync a log entry to Sheets
    func syncLog(_ entry: DailyLogEntry) async {
        let values = [
            entry.id,
            entry.userId,
            entry.text,
            entry.tag.rawValue,
            ISO8601DateFormatter().string(from: entry.createdAt)
        ]
        
        do {
            try await appendRow(tab: "Logs", values: values)
        } catch {
            print("Failed to sync log: \(error)")
        }
    }
    
    /// Sync an expense to Sheets
    func syncExpense(_ entry: ExpenseEntry) async {
        let values = [
            entry.id,
            entry.userId,
            String(entry.amount),
            entry.currency,
            entry.category,
            entry.note,
            ISO8601DateFormatter().string(from: entry.createdAt)
        ]
        
        do {
            try await appendRow(tab: "Expenses", values: values)
        } catch {
            print("Failed to sync expense: \(error)")
        }
    }
    
    /// Sync food entry to Sheets
    func syncFood(_ entry: FoodEntry) async {
        let values = [
            entry.id,
            entry.userId,
            entry.name,
            entry.portionSize,
            entry.calories.map { String($0) } ?? "",
            entry.mealType.rawValue,
            ISO8601DateFormatter().string(from: entry.createdAt)
        ]
        
        do {
            try await appendRow(tab: "Food", values: values)
        } catch {
            print("Failed to sync food: \(error)")
        }
    }
    
    /// Sync sleep entry to Sheets
    func syncSleep(_ entry: SleepEntry) async {
        let values = [
            entry.id,
            entry.userId,
            String(entry.hours),
            entry.quality.rawValue,
            ISO8601DateFormatter().string(from: entry.date),
            ISO8601DateFormatter().string(from: entry.createdAt)
        ]
        
        do {
            try await appendRow(tab: "Sleep", values: values)
        } catch {
            print("Failed to sync sleep: \(error)")
        }
    }
    
    /// Sync activity entry to Sheets
    func syncActivity(_ entry: ActivityEntry) async {
        let values = [
            entry.id,
            entry.userId,
            String(entry.steps),
            entry.distanceKm.map { String($0) } ?? "",
            ISO8601DateFormatter().string(from: entry.date),
            entry.source.rawValue,
            ISO8601DateFormatter().string(from: entry.createdAt)
        ]
        
        do {
            try await appendRow(tab: "Activity", values: values)
        } catch {
            print("Failed to sync activity: \(error)")
        }
    }
}

// MARK: - Errors

enum SheetsError: LocalizedError {
    case invalidCredentials
    case authFailed
    case invalidURL
    case readFailed
    case writeFailed
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid Google service account credentials"
        case .authFailed:
            return "Failed to authenticate with Google"
        case .invalidURL:
            return "Invalid Sheets API URL"
        case .readFailed:
            return "Failed to read from Google Sheets"
        case .writeFailed:
            return "Failed to write to Google Sheets"
        }
    }
}
