//
//  SearchViewModel.swift
//  LifeLogAI
//
//  Manages the AI chat/search interface.
//  Sends queries to Gemini API and displays responses.
//

import Foundation
import SwiftUI

@MainActor
class SearchViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading: Bool = false
    @Published var inputText: String = ""
    
    private let storage = StorageService.shared
    private let gemini = GeminiService.shared
    
    init() {
        loadMessages()
    }
    
    // MARK: - Load/Save
    
    func loadMessages() {
        messages = storage.loadChatMessages()
    }
    
    private func saveMessages() {
        storage.saveChatMessages(messages)
    }
    
    // MARK: - Send Message
    
    func sendMessage(context: String = "") async {
        let query = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return }
        
        // Clear input
        inputText = ""
        
        // Add user message
        let userMessage = ChatMessage(role: .user, content: query)
        messages.append(userMessage)
        saveMessages()
        
        isLoading = true
        
        // Get AI response
        let response = await gemini.search(query: query, context: context)
        
        // Add assistant message
        var assistantMessage = ChatMessage(role: .assistant, content: response)
        assistantMessage.relatedQuery = query
        messages.append(assistantMessage)
        saveMessages()
        
        isLoading = false
    }
    
    // MARK: - Build Context
    
    func buildContext(from logViewModel: LogViewModel) -> String {
        var context = ""
        
        // Recent logs
        let recentLogs = logViewModel.dailyLogs.prefix(10)
        if !recentLogs.isEmpty {
            context += "Recent log entries:\n"
            for log in recentLogs {
                context += "- \(log.text) (\(log.tag.label))\n"
            }
            context += "\n"
        }
        
        // Today's expenses
        let todayExpenses = logViewModel.todayExpenses
        if !todayExpenses.isEmpty {
            let total = todayExpenses.reduce(0) { $0 + $1.amount }
            context += "Expenses today: $\(String(format: "%.2f", total))\n"
            for expense in todayExpenses {
                context += "- \(expense.formattedAmount) on \(expense.category)\n"
            }
            context += "\n"
        }
        
        // Today's food
        let todayFood = logViewModel.todayFood
        if !todayFood.isEmpty {
            context += "Food today:\n"
            for food in todayFood {
                context += "- \(food.displayText)\n"
            }
            context += "\n"
        }
        
        // Sleep
        if let sleep = logViewModel.todaySleep.first {
            context += "Sleep last night: \(sleep.displayText)\n\n"
        }
        
        // Steps
        let steps = logViewModel.stepsToday
        if steps > 0 {
            context += "Steps today: \(steps.formatted())\n\n"
        }
        
        return context
    }
    
    // MARK: - Clear History
    
    func clearHistory() {
        messages.removeAll()
        saveMessages()
    }
    
    // MARK: - Suggestions
    
    var suggestions: [String] {
        [
            "How much did I spend this week?",
            "How is my sleep pattern?",
            "Summarize my food intake today",
            "How active have I been?",
            "What should I focus on today?"
        ]
    }
}
