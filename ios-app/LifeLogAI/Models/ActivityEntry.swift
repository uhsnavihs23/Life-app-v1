//
//  ActivityEntry.swift
//  LifeLogAI
//
//  Tracks physical activity like steps and distance.
//  Can be populated manually or from HealthKit.
//

import Foundation

enum ActivitySource: String, Codable {
    case manual      // User entered manually
    case healthkit   // Imported from Apple Health
}

struct ActivityEntry: Codable, Identifiable {
    let id: String
    let userId: String
    var steps: Int
    var distanceKm: Double?
    var date: Date
    var source: ActivitySource
    let createdAt: Date
    
    /// Active minutes (optional, from HealthKit)
    var activeMinutes: Int?
    
    /// Calories burned (optional, from HealthKit)
    var caloriesBurned: Int?
    
    init(userId: String, steps: Int, distanceKm: Double? = nil, date: Date = Date(), source: ActivitySource = .manual) {
        self.id = UUID().uuidString
        self.userId = userId
        self.steps = steps
        self.distanceKm = distanceKm
        self.date = date
        self.source = source
        self.createdAt = Date()
    }
    
    /// Display string for the entry
    var displayText: String {
        var text = "\(steps.formatted()) steps"
        if let km = distanceKm {
            text += " · \(String(format: "%.1f", km)) km"
        }
        return text
    }
    
    /// Formatted distance in miles (for US users)
    var distanceMiles: Double? {
        guard let km = distanceKm else { return nil }
        return km * 0.621371
    }
}
