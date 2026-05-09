//
//  SleepEntry.swift
//  LifeLogAI
//
//  Tracks sleep duration and quality for a given date.
//

import Foundation

enum SleepQuality: String, Codable, CaseIterable {
    case poor
    case fair
    case good
    case excellent
    
    var label: String { rawValue.capitalized }
    
    var emoji: String {
        switch self {
        case .poor: return "😫"
        case .fair: return "😐"
        case .good: return "😊"
        case .excellent: return "🤩"
        }
    }
    
    var score: Int {
        switch self {
        case .poor: return 1
        case .fair: return 2
        case .good: return 3
        case .excellent: return 4
        }
    }
}

struct SleepEntry: Codable, Identifiable {
    let id: String
    let userId: String
    var hours: Double
    var quality: SleepQuality
    var date: Date  // The date of sleep (usually previous night)
    let createdAt: Date
    
    /// Optional notes about sleep
    var notes: String?
    
    init(userId: String, hours: Double, quality: SleepQuality, date: Date = Date()) {
        self.id = UUID().uuidString
        self.userId = userId
        self.hours = hours
        self.quality = quality
        self.date = date
        self.createdAt = Date()
    }
    
    /// Display string for the entry
    var displayText: String {
        "\(String(format: "%.1f", hours))h - \(quality.label)"
    }
}
