//
//  ExpenseEntry.swift
//  LifeLogAI
//
//  Tracks individual expenses with amount, category, and notes.
//

import Foundation

struct ExpenseEntry: Codable, Identifiable {
    let id: String
    let userId: String
    var amount: Double
    var currency: String
    var category: String
    var note: String
    let createdAt: Date
    
    init(userId: String, amount: Double, category: String, note: String = "", currency: String = "USD") {
        self.id = UUID().uuidString
        self.userId = userId
        self.amount = amount
        self.currency = currency
        self.category = category
        self.note = note
        self.createdAt = Date()
    }
    
    /// Formatted amount string (e.g., "$45.00")
    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        return formatter.string(from: NSNumber(value: amount)) ?? "$\(amount)"
    }
}
