//
//  Reminder.swift
//  LifeLogAI
//
//  A reminder with title, description, date/time, and optional recurrence.
//  Integrates with iOS local notifications.
//

import Foundation

enum RecurrenceInterval: String, Codable, CaseIterable {
    case daily
    case weekly
    case monthly
    
    var label: String { rawValue.capitalized }
}

struct Reminder: Codable, Identifiable {
    let id: String
    let userId: String
    var title: String
    var description: String
    var dateTime: Date
    var isRecurring: Bool
    var recurrenceInterval: RecurrenceInterval?
    var isCompleted: Bool
    let createdAt: Date
    
    /// The notification identifier (for canceling)
    var notificationId: String?
    
    init(userId: String, title: String, description: String = "", dateTime: Date, isRecurring: Bool = false, recurrenceInterval: RecurrenceInterval? = nil) {
        self.id = UUID().uuidString
        self.userId = userId
        self.title = title
        self.description = description
        self.dateTime = dateTime
        self.isRecurring = isRecurring
        self.recurrenceInterval = recurrenceInterval
        self.isCompleted = false
        self.createdAt = Date()
        self.notificationId = UUID().uuidString
    }
    
    /// Check if the reminder is upcoming (not past and not completed)
    var isUpcoming: Bool {
        !isCompleted && dateTime > Date()
    }
    
    /// Check if the reminder is overdue
    var isOverdue: Bool {
        !isCompleted && dateTime < Date()
    }
}
