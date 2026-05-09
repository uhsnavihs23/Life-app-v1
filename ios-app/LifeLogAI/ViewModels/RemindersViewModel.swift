//
//  RemindersViewModel.swift
//  LifeLogAI
//
//  Manages reminders and local notifications.
//

import Foundation
import SwiftUI

@MainActor
class RemindersViewModel: ObservableObject {
    @Published var reminders: [Reminder] = []
    @Published var isLoading: Bool = false
    
    private let storage = StorageService.shared
    private let notifications = NotificationService.shared
    
    var upcomingReminders: [Reminder] {
        reminders
            .filter { !$0.isCompleted && $0.dateTime > Date() }
            .sorted { $0.dateTime < $1.dateTime }
    }
    
    var pastReminders: [Reminder] {
        reminders
            .filter { $0.isCompleted || $0.dateTime <= Date() }
            .sorted { $0.dateTime > $1.dateTime }
    }
    
    init() {
        loadReminders()
        setupNotificationHandlers()
    }
    
    // MARK: - Load/Save
    
    func loadReminders() {
        reminders = storage.loadReminders()
    }
    
    private func saveReminders() {
        storage.saveReminders(reminders)
    }
    
    // MARK: - CRUD Operations
    
    func addReminder(
        title: String,
        description: String,
        dateTime: Date,
        isRecurring: Bool,
        recurrenceInterval: RecurrenceInterval?,
        userId: String
    ) {
        let reminder = Reminder(
            userId: userId,
            title: title,
            description: description,
            dateTime: dateTime,
            isRecurring: isRecurring,
            recurrenceInterval: recurrenceInterval
        )
        
        reminders.insert(reminder, at: 0)
        saveReminders()
        
        // Schedule notification
        notifications.scheduleNotification(for: reminder)
    }
    
    func toggleReminder(_ id: String) {
        if let index = reminders.firstIndex(where: { $0.id == id }) {
            reminders[index].isCompleted.toggle()
            saveReminders()
            
            // Cancel notification if completed
            if reminders[index].isCompleted {
                notifications.cancelNotification(for: reminders[index])
            } else {
                // Reschedule if uncompleted and in future
                if reminders[index].dateTime > Date() {
                    notifications.scheduleNotification(for: reminders[index])
                }
            }
        }
    }
    
    func deleteReminder(_ id: String) {
        if let reminder = reminders.first(where: { $0.id == id }) {
            notifications.cancelNotification(for: reminder)
        }
        reminders.removeAll { $0.id == id }
        saveReminders()
    }
    
    func snoozeReminder(_ id: String, minutes: Int = 10) {
        if let index = reminders.firstIndex(where: { $0.id == id }) {
            // Update time
            reminders[index].dateTime = Date().addingTimeInterval(TimeInterval(minutes * 60))
            saveReminders()
            
            // Reschedule notification
            notifications.scheduleNotification(for: reminders[index])
        }
    }
    
    // MARK: - Notification Handlers
    
    private func setupNotificationHandlers() {
        NotificationCenter.default.addObserver(
            forName: .reminderCompleted,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let id = notification.userInfo?["reminderId"] as? String {
                self?.toggleReminder(id)
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .reminderSnoozed,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let id = notification.userInfo?["reminderId"] as? String {
                self?.snoozeReminder(id)
            }
        }
    }
}
