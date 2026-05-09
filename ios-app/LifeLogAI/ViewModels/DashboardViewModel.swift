//
//  DashboardViewModel.swift
//  LifeLogAI
//
//  Aggregates data for dashboard display including:
//  - Statistics summary
//  - Charts data
//  - AI insights
//

import Foundation
import SwiftUI

@MainActor
class DashboardViewModel: ObservableObject {
    // MARK: - Published Properties
    
    @Published var summary: DashboardSummary?
    @Published var sleepChartData: [ChartDataPoint] = []
    @Published var stepsChartData: [ChartDataPoint] = []
    @Published var expensesByCategory: [CategoryData] = []
    @Published var aiInsights: [String] = []
    @Published var isLoading: Bool = false
    
    // MARK: - Services
    
    private let storage = StorageService.shared
    private let gemini = GeminiService.shared
    private let healthKit = HealthKitService.shared
    
    // MARK: - Refresh Dashboard
    
    func refresh(using logViewModel: LogViewModel) async {
        isLoading = true
        
        // Calculate summary
        let today = Calendar.current.startOfDay(for: Date())
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: today)!
        
        // Expenses
        let expensesToday = logViewModel.expenses
            .filter { Calendar.current.isDate($0.createdAt, inSameDayAs: today) }
            .reduce(0) { $0 + $1.amount }
        
        let expensesWeek = logViewModel.expenses
            .filter { $0.createdAt >= weekAgo }
            .reduce(0) { $0 + $1.amount }
        
        // Food
        let foodToday = logViewModel.foodEntries
            .filter { Calendar.current.isDate($0.createdAt, inSameDayAs: today) }
        
        let mealsToday = foodToday.count
        let caloriesToday = foodToday.compactMap { $0.calories }.reduce(0, +)
        
        // Sleep
        let sleepToday = logViewModel.sleepEntries
            .first { Calendar.current.isDate($0.date, inSameDayAs: today) }?.hours ?? 0
        
        let sleepEntries = logViewModel.sleepEntries.filter { $0.date >= weekAgo }
        let sleepAvgWeek = sleepEntries.isEmpty ? 0 : sleepEntries.reduce(0) { $0 + $1.hours } / Double(sleepEntries.count)
        
        // Steps - try HealthKit first, fall back to manual entries
        var stepsToday = 0
        if healthKit.isAvailable {
            stepsToday = await healthKit.getStepsToday()
        }
        if stepsToday == 0 {
            stepsToday = logViewModel.activities
                .filter { Calendar.current.isDate($0.date, inSameDayAs: today) }
                .reduce(0) { $0 + $1.steps }
        }
        
        summary = DashboardSummary(
            totalExpensesToday: expensesToday,
            totalExpensesWeek: expensesWeek,
            mealsToday: mealsToday,
            caloriesToday: caloriesToday,
            sleepHoursToday: sleepToday,
            sleepAvgWeek: sleepAvgWeek,
            stepsToday: stepsToday,
            entriesCount: logViewModel.dailyLogs.count
        )
        
        // Build chart data
        buildSleepChartData(from: logViewModel.sleepEntries)
        await buildStepsChartData(from: logViewModel.activities)
        buildExpensesCategoryData(from: logViewModel.expenses.filter { $0.createdAt >= weekAgo })
        
        // Generate AI insights
        generateInsights()
        
        isLoading = false
    }
    
    // MARK: - Chart Data Builders
    
    private func buildSleepChartData(from entries: [SleepEntry]) {
        var data: [ChartDataPoint] = []
        let calendar = Calendar.current
        
        for i in (0..<7).reversed() {
            let date = calendar.date(byAdding: .day, value: -i, to: Date())!
            let dayEntry = entries.first { calendar.isDate($0.date, inSameDayAs: date) }
            let dayName = DateFormatter().shortWeekdaySymbols[calendar.component(.weekday, from: date) - 1]
            
            data.append(ChartDataPoint(
                label: dayName,
                value: dayEntry?.hours ?? 0,
                date: date
            ))
        }
        
        sleepChartData = data
    }
    
    private func buildStepsChartData(from entries: [ActivityEntry]) async {
        var data: [ChartDataPoint] = []
        let calendar = Calendar.current
        
        for i in (0..<7).reversed() {
            let date = calendar.date(byAdding: .day, value: -i, to: Date())!
            let dayName = DateFormatter().shortWeekdaySymbols[calendar.component(.weekday, from: date) - 1]
            
            // Try HealthKit first
            var steps = 0
            if healthKit.isAvailable {
                steps = await healthKit.getSteps(for: date)
            }
            
            // Fall back to manual entries
            if steps == 0 {
                steps = entries
                    .filter { calendar.isDate($0.date, inSameDayAs: date) }
                    .reduce(0) { $0 + $1.steps }
            }
            
            data.append(ChartDataPoint(
                label: dayName,
                value: Double(steps),
                date: date
            ))
        }
        
        stepsChartData = data
    }
    
    private func buildExpensesCategoryData(from entries: [ExpenseEntry]) {
        var categoryTotals: [String: Double] = [:]
        
        for entry in entries {
            categoryTotals[entry.category, default: 0] += entry.amount
        }
        
        expensesByCategory = categoryTotals.map { CategoryData(name: $0.key, amount: $0.value) }
            .sorted { $0.amount > $1.amount }
    }
    
    // MARK: - AI Insights
    
    private func generateInsights() {
        var insights: [String] = []
        
        if let sum = summary {
            // Sleep insight
            if sum.sleepHoursToday > 0 {
                if sum.sleepHoursToday >= 7 {
                    insights.append("Great sleep! You got \(String(format: "%.1f", sum.sleepHoursToday)) hours last night. 😊")
                } else {
                    insights.append("You slept \(String(format: "%.1f", sum.sleepHoursToday)) hours. Try to get 7-9 hours for optimal health. 💤")
                }
            }
            
            // Steps insight
            if sum.stepsToday > 0 {
                if sum.stepsToday >= 10000 {
                    insights.append("Amazing! You hit \(sum.stepsToday.formatted()) steps today! 🎉")
                } else {
                    let remaining = 10000 - sum.stepsToday
                    insights.append("You've walked \(sum.stepsToday.formatted()) steps. \(remaining.formatted()) more to reach 10k! 🚶")
                }
            }
            
            // Expense insight
            if sum.totalExpensesWeek > 0 {
                insights.append("You've spent $\(String(format: "%.2f", sum.totalExpensesWeek)) this week across \(expensesByCategory.count) categories. 💰")
            }
        }
        
        // Add placeholder for real AI insights
        if insights.isEmpty {
            insights.append("Start logging your activities to get personalized insights! ✨")
        }
        
        aiInsights = insights
    }
}

// MARK: - Supporting Types

struct DashboardSummary {
    let totalExpensesToday: Double
    let totalExpensesWeek: Double
    let mealsToday: Int
    let caloriesToday: Int
    let sleepHoursToday: Double
    let sleepAvgWeek: Double
    let stepsToday: Int
    let entriesCount: Int
}

struct ChartDataPoint: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    let date: Date
}

struct CategoryData: Identifiable {
    let id = UUID()
    let name: String
    let amount: Double
}
