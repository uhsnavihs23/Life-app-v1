//
//  NotificationService.swift
//  LifeLogAI
//
//  Manages local notifications for reminders.
//  Uses UNUserNotificationCenter for scheduling alerts.
//

import Foundation
import UserNotifications

class NotificationService: NSObject {
    static let shared = NotificationService()
    
    private let center = UNUserNotificationCenter.current()
    
    override init() {
        super.init()
        center.delegate = self
    }
    
    // MARK: - Permissions
    
    /// Request notification permissions
    func requestPermissions() {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
            print("Notifications permission granted: \(granted)")
        }
    }
    
    /// Check current authorization status
    func checkPermissions() async -> UNAuthorizationStatus {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus
    }
    
    // MARK: - Schedule Notifications
    
    /// Schedule a notification for a reminder
    func scheduleNotification(for reminder: Reminder) {
        let content = UNMutableNotificationContent()
        content.title = "⏰ \(reminder.title)"
        content.body = reminder.description.isEmpty ? "Time for your reminder!" : reminder.description
        content.sound = .default
        content.categoryIdentifier = "REMINDER"
        
        // Add data for handling tap
        content.userInfo = ["reminderId": reminder.id]
        
        // Create trigger based on date/time
        let dateComponents = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: reminder.dateTime
        )
        
        let trigger: UNNotificationTrigger
        
        if reminder.isRecurring, let interval = reminder.recurrenceInterval {
            // Recurring notification
            var components = DateComponents()
            components.hour = dateComponents.hour
            components.minute = dateComponents.minute
            
            switch interval {
            case .daily:
                // Every day at the same time
                trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            case .weekly:
                // Every week on the same day
                components.weekday = dateComponents.weekday
                trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            case .monthly:
                // Every month on the same day
                components.day = dateComponents.day
                trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            }
        } else {
            // One-time notification
            trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
        }
        
        let request = UNNotificationRequest(
            identifier: reminder.notificationId ?? reminder.id,
            content: content,
            trigger: trigger
        )
        
        center.add(request) { error in
            if let error = error {
                print("Failed to schedule notification: \(error)")
            } else {
                print("Notification scheduled for: \(reminder.dateTime)")
            }
        }
    }
    
    /// Cancel a scheduled notification
    func cancelNotification(identifier: String) {
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
    }
    
    /// Cancel all notifications for a reminder
    func cancelNotification(for reminder: Reminder) {
        if let notifId = reminder.notificationId {
            cancelNotification(identifier: notifId)
        }
        cancelNotification(identifier: reminder.id)
    }
    
    /// Cancel all pending notifications
    func cancelAllNotifications() {
        center.removeAllPendingNotificationRequests()
    }
    
    // MARK: - Notification Categories
    
    /// Set up notification actions (e.g., "Mark Complete", "Snooze")
    func setupCategories() {
        let completeAction = UNNotificationAction(
            identifier: "COMPLETE_ACTION",
            title: "Mark Complete",
            options: [.foreground]
        )
        
        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE_ACTION",
            title: "Snooze 10 min",
            options: []
        )
        
        let reminderCategory = UNNotificationCategory(
            identifier: "REMINDER",
            actions: [completeAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )
        
        center.setNotificationCategories([reminderCategory])
    }
}

// MARK: - Notification Delegate

extension NotificationService: UNUserNotificationCenterDelegate {
    /// Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is open
        completionHandler([.banner, .sound])
    }
    
    /// Handle notification tap or action
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let reminderId = userInfo["reminderId"] as? String
        
        switch response.actionIdentifier {
        case "COMPLETE_ACTION":
            // Mark reminder as complete
            if let id = reminderId {
                NotificationCenter.default.post(
                    name: .reminderCompleted,
                    object: nil,
                    userInfo: ["reminderId": id]
                )
            }
            
        case "SNOOZE_ACTION":
            // Reschedule for 10 minutes later
            if let id = reminderId {
                // Post notification to handle in ViewModel
                NotificationCenter.default.post(
                    name: .reminderSnoozed,
                    object: nil,
                    userInfo: ["reminderId": id]
                )
            }
            
        case UNNotificationDefaultActionIdentifier:
            // User tapped the notification - navigate to reminders tab
            if let id = reminderId {
                NotificationCenter.default.post(
                    name: .openReminder,
                    object: nil,
                    userInfo: ["reminderId": id]
                )
            }
            
        default:
            break
        }
        
        completionHandler()
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let reminderCompleted = Notification.Name("reminderCompleted")
    static let reminderSnoozed = Notification.Name("reminderSnoozed")
    static let openReminder = Notification.Name("openReminder")
}
