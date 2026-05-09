//
//  StorageService.swift
//  LifeLogAI
//
//  Handles local data persistence using UserDefaults and FileManager.
//  This is the foundation layer - data is saved locally first,
//  then synced to Google Sheets in the background.
//
//  TO MIGRATE TO CORE DATA:
//  1. Create a .xcdatamodeld file with your entities
//  2. Replace the save/load methods with Core Data fetch/save
//  3. Keep the same method signatures so ViewModels don't change
//

import Foundation

class StorageService {
    static let shared = StorageService()
    
    private let defaults = UserDefaults.standard
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let fileManager = FileManager.default
    
    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - Generic Save/Load
    
    /// Save any Codable object to UserDefaults
    func save<T: Codable>(_ object: T, forKey key: String) {
        do {
            let data = try encoder.encode(object)
            defaults.set(data, forKey: "lifelog_\(key)")
        } catch {
            print("StorageService: Failed to save \(key): \(error)")
        }
    }
    
    /// Load any Codable object from UserDefaults
    func load<T: Codable>(forKey key: String) -> T? {
        guard let data = defaults.data(forKey: "lifelog_\(key)") else {
            return nil
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("StorageService: Failed to load \(key): \(error)")
            return nil
        }
    }
    
    /// Remove data for a key
    func remove(forKey key: String) {
        defaults.removeObject(forKey: "lifelog_\(key)")
    }
    
    // MARK: - User
    
    func saveUser(_ user: User) {
        save(user, forKey: "current_user")
    }
    
    func loadUser() -> User? {
        load(forKey: "current_user")
    }
    
    func clearUser() {
        remove(forKey: "current_user")
    }
    
    // MARK: - Daily Logs
    
    func saveLogs(_ logs: [DailyLogEntry]) {
        save(logs, forKey: "daily_logs")
    }
    
    func loadLogs() -> [DailyLogEntry] {
        load(forKey: "daily_logs") ?? []
    }
    
    // MARK: - Expenses
    
    func saveExpenses(_ expenses: [ExpenseEntry]) {
        save(expenses, forKey: "expenses")
    }
    
    func loadExpenses() -> [ExpenseEntry] {
        load(forKey: "expenses") ?? []
    }
    
    // MARK: - Food
    
    func saveFoodEntries(_ entries: [FoodEntry]) {
        save(entries, forKey: "food_entries")
    }
    
    func loadFoodEntries() -> [FoodEntry] {
        load(forKey: "food_entries") ?? []
    }
    
    // MARK: - Sleep
    
    func saveSleepEntries(_ entries: [SleepEntry]) {
        save(entries, forKey: "sleep_entries")
    }
    
    func loadSleepEntries() -> [SleepEntry] {
        load(forKey: "sleep_entries") ?? []
    }
    
    // MARK: - Activity
    
    func saveActivities(_ activities: [ActivityEntry]) {
        save(activities, forKey: "activities")
    }
    
    func loadActivities() -> [ActivityEntry] {
        load(forKey: "activities") ?? []
    }
    
    // MARK: - Files
    
    func saveFiles(_ files: [FileAttachment]) {
        save(files, forKey: "files")
    }
    
    func loadFiles() -> [FileAttachment] {
        load(forKey: "files") ?? []
    }
    
    // MARK: - Reminders
    
    func saveReminders(_ reminders: [Reminder]) {
        save(reminders, forKey: "reminders")
    }
    
    func loadReminders() -> [Reminder] {
        load(forKey: "reminders") ?? []
    }
    
    // MARK: - Chat History
    
    func saveChatMessages(_ messages: [ChatMessage]) {
        save(messages, forKey: "chat_messages")
    }
    
    func loadChatMessages() -> [ChatMessage] {
        load(forKey: "chat_messages") ?? []
    }
    
    // MARK: - File Storage (for PDFs/Images)
    
    /// Get the documents directory URL
    var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    /// Save file data to documents directory
    func saveFile(data: Data, fileName: String) -> URL? {
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            print("StorageService: Failed to save file: \(error)")
            return nil
        }
    }
    
    /// Load file data from documents directory
    func loadFile(fileName: String) -> Data? {
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        return try? Data(contentsOf: fileURL)
    }
    
    /// Delete file from documents directory
    func deleteFile(fileName: String) {
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        try? fileManager.removeItem(at: fileURL)
    }
    
    // MARK: - Clear All Data
    
    func clearAllData() {
        let keys = ["current_user", "daily_logs", "expenses", "food_entries",
                   "sleep_entries", "activities", "files", "reminders", "chat_messages"]
        keys.forEach { remove(forKey: $0) }
    }
}
