//
//  FoodEntry.swift
//  LifeLogAI
//
//  Tracks food intake with name, portion, calories, and meal type.
//  AI can analyze patterns and provide nutritional insights.
//

import Foundation

enum MealType: String, Codable, CaseIterable {
    case breakfast
    case lunch
    case dinner
    case snack
    
    var label: String { rawValue.capitalized }
    
    var emoji: String {
        switch self {
        case .breakfast: return "🌅"
        case .lunch: return "☀️"
        case .dinner: return "🌙"
        case .snack: return "🍿"
        }
    }
}

struct FoodEntry: Codable, Identifiable {
    let id: String
    let userId: String
    var name: String
    var portionSize: String
    var calories: Int?
    var mealType: MealType
    let createdAt: Date
    
    /// AI-generated nutritional analysis
    var nutritionNotes: String?
    
    init(userId: String, name: String, portionSize: String, calories: Int? = nil, mealType: MealType) {
        self.id = UUID().uuidString
        self.userId = userId
        self.name = name
        self.portionSize = portionSize
        self.calories = calories
        self.mealType = mealType
        self.createdAt = Date()
    }
    
    /// Display string for the entry
    var displayText: String {
        var text = "\(name) (\(portionSize))"
        if let cal = calories {
            text += " - \(cal) cal"
        }
        return text
    }
}
