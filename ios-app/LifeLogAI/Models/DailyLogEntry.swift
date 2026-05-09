//
//  DailyLogEntry.swift
//  LifeLogAI
//
//  A free-text journal entry that can be tagged with a category.
//  The AI (Gemini) will classify these entries and extract structured data.
//

import Foundation

/// Tags for categorizing log entries
enum EntryTag: String, Codable, CaseIterable {
    case general
    case expense
    case food
    case sleep
    case exercise
    case note
    
    var label: String {
        switch self {
        case .general: return "General"
        case .expense: return "Expense"
        case .food: return "Food"
        case .sleep: return "Sleep"
        case .exercise: return "Exercise"
        case .note: return "Note"
        }
    }
    
    var emoji: String {
        switch self {
        case .general: return "📋"
        case .expense: return "💰"
        case .food: return "🍽️"
        case .sleep: return "😴"
        case .exercise: return "🏃"
        case .note: return "📌"
        }
    }
    
    var color: String {
        switch self {
        case .general: return "#6366f1"
        case .expense: return "#ef4444"
        case .food: return "#f59e0b"
        case .sleep: return "#8b5cf6"
        case .exercise: return "#10b981"
        case .note: return "#64748b"
        }
    }
}

struct DailyLogEntry: Codable, Identifiable {
    let id: String
    let userId: String
    var text: String
    var tag: EntryTag
    let createdAt: Date
    
    /// AI-classified structured data (filled by Gemini after processing)
    var classifiedData: [String: String]?
    
    init(userId: String, text: String, tag: EntryTag = .general) {
        self.id = UUID().uuidString
        self.userId = userId
        self.text = text
        self.tag = tag
        self.createdAt = Date()
    }
}
