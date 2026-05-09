//
//  LogViewModel.swift
//  LifeLogAI
//
//  Manages all log entries, expenses, food, sleep, and activity data.
//  Handles adding, fetching, and syncing to Google Sheets.
//

import Foundation
import SwiftUI

@MainActor
class LogViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var dailyLogs: [DailyLogEntry] = []
    @Published var expenses: [ExpenseEntry] = []
    @Published var foodEntries: [FoodEntry] = []
    @Published var sleepEntries: [SleepEntry] = []
    @Published var activities: [ActivityEntry] = []
    @Published var isLoading: Bool = false
    
    // MARK: - Services
    
    private let storage = StorageService.shared
    private let gemini = GeminiService.shared
    private let sheets = GoogleSheetsService.shared
    
    // MARK: - Initialization
    
    init() {
        loadAllData()
    }
    
    /// Load all data from local storage
    func loadAllData() {
        dailyLogs = storage.loadLogs()
        expenses = storage.loadExpenses()
        foodEntries = storage.loadFoodEntries()
        sleepEntries = storage.loadSleepEntries()
        activities = storage.loadActivities()
    }
    
    // MARK: - Today's Data
    
    var todayLogs: [DailyLogEntry] {
        let today = Calendar.current.startOfDay(for: Date())
        return dailyLogs.filter { Calendar.current.isDate($0.createdAt, inSameDayAs: today) }
    }
    
    var todayExpenses: [ExpenseEntry] {
        let today = Calendar.current.startOfDay(for: Date())
        return expenses.filter { Calendar.current.isDate($0.createdAt, inSameDayAs: today) }
    }
    
    var todayFood: [FoodEntry] {
        let today = Calendar.current.startOfDay(for: Date())
        return foodEntries.filter { Calendar.current.isDate($0.createdAt, inSameDayAs: today) }
    }
    
    var todaySleep: [SleepEntry] {
        let today = Calendar.current.startOfDay(for: Date())
        return sleepEntries.filter { Calendar.current.isDate($0.date, inSameDayAs: today) }
    }
    
    var todayActivity: [ActivityEntry] {
        let today = Calendar.current.startOfDay(for: Date())
        return activities.filter { Calendar.current.isDate($0.date, inSameDayAs: today) }
    }
    
    // MARK: - Add Log Entry
    
    func addLog(text: String, tag: EntryTag, userId: String) async {
        var entry = DailyLogEntry(userId: userId, text: text, tag: tag)
        
        // Optionally classify with AI
        let classification = await gemini.classifyLog(text: text)
        entry.classifiedData = classification.extractedData.mapValues { "\($0)" }
        
        // Add to local array and save
        dailyLogs.insert(entry, at: 0)
        storage.saveLogs(dailyLogs)
        
        // Sync to Google Sheets in background
        Task {
            await sheets.syncLog(entry)
        }
    }
    
    // MARK: - Add Expense
    
    func addExpense(amount: Double, category: String, note: String, userId: String) {
        let entry = ExpenseEntry(userId: userId, amount: amount, category: category, note: note)
        
        expenses.insert(entry, at: 0)
        storage.saveExpenses(expenses)
        
        Task {
            await sheets.syncExpense(entry)
        }
    }
    
    // MARK: - Add Food
    
    func addFood(name: String, portionSize: String, calories: Int?, mealType: MealType, userId: String) {
        let entry = FoodEntry(userId: userId, name: name, portionSize: portionSize, calories: calories, mealType: mealType)
        
        foodEntries.insert(entry, at: 0)
        storage.saveFoodEntries(foodEntries)
        
        Task {
            await sheets.syncFood(entry)
        }
    }
    
    // MARK: - Add Sleep
    
    func addSleep(hours: Double, quality: SleepQuality, userId: String) {
        let entry = SleepEntry(userId: userId, hours: hours, quality: quality)
        
        sleepEntries.insert(entry, at: 0)
        storage.saveSleepEntries(sleepEntries)
        
        Task {
            await sheets.syncSleep(entry)
        }
    }
    
    // MARK: - Add Activity
    
    func addActivity(steps: Int, distanceKm: Double?, userId: String, source: ActivitySource = .manual) {
        let entry = ActivityEntry(userId: userId, steps: steps, distanceKm: distanceKm, source: source)
        
        activities.insert(entry, at: 0)
        storage.saveActivities(activities)
        
        Task {
            await sheets.syncActivity(entry)
        }
    }
    
    // MARK: - Statistics
    
    var totalExpensesToday: Double {
        todayExpenses.reduce(0) { $0 + $1.amount }
    }
    
    var totalExpensesThisWeek: Double {
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        return expenses
            .filter { $0.createdAt > weekAgo }
            .reduce(0) { $0 + $1.amount }
    }
    
    var totalCaloriesToday: Int {
        todayFood.compactMap { $0.calories }.reduce(0, +)
    }
    
    var sleepHoursToday: Double {
        todaySleep.first?.hours ?? 0
    }
    
    var stepsToday: Int {
        todayActivity.reduce(0) { $0 + $1.steps }
    }
}
