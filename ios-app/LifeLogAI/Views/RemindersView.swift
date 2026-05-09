//
//  RemindersView.swift
//  LifeLogAI
//
//  Create and manage reminders with local notifications.
//

import SwiftUI

struct RemindersView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var remindersViewModel: RemindersViewModel
    
    @State private var showAddSheet = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Notification permission banner
                    if NotificationService.shared.checkPermissions == nil {
                        notificationBanner
                    }
                    
                    // Upcoming
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Upcoming (\(remindersViewModel.upcomingReminders.count))", systemImage: "clock")
                            .font(.headline)
                        
                        if remindersViewModel.upcomingReminders.isEmpty {
                            emptyState
                        } else {
                            ForEach(remindersViewModel.upcomingReminders) { reminder in
                                ReminderCard(reminder: reminder) {
                                    remindersViewModel.toggleReminder(reminder.id)
                                } onDelete: {
                                    remindersViewModel.deleteReminder(reminder.id)
                                }
                            }
                        }
                    }
                    
                    // Past / Completed
                    if !remindersViewModel.pastReminders.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Past (\(remindersViewModel.pastReminders.count))", systemImage: "checkmark.circle")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            
                            ForEach(remindersViewModel.pastReminders.prefix(5)) { reminder in
                                ReminderCard(reminder: reminder, isPast: true) {
                                    remindersViewModel.toggleReminder(reminder.id)
                                } onDelete: {
                                    remindersViewModel.deleteReminder(reminder.id)
                                }
                            }
                        }
                        .opacity(0.6)
                    }
                }
                .padding()
            }
            .navigationTitle("Reminders")
            .toolbar {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showAddSheet) {
                AddReminderSheet()
            }
        }
    }
    
    private var notificationBanner: some View {
        HStack {
            Image(systemName: "bell.badge")
                .font(.title2)
                .foregroundColor(.orange)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Enable Notifications")
                    .font(.subheadline.bold())
                Text("Get alerted when reminders are due")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button("Allow") {
                NotificationService.shared.requestPermissions()
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(16)
    }
    
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bell")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            Text("No upcoming reminders")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

// MARK: - Reminder Card

struct ReminderCard: View {
    let reminder: Reminder
    var isPast: Bool = false
    let onToggle: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Checkbox
            Button(action: onToggle) {
                Image(systemName: reminder.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(reminder.isCompleted ? .green : .secondary)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(reminder.title)
                    .font(.subheadline.weight(.medium))
                    .strikethrough(reminder.isCompleted)
                
                if !reminder.description.isEmpty {
                    Text(reminder.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Label(reminder.dateTime, format: .dateTime.month().day().hour().minute())
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if reminder.isRecurring, let interval = reminder.recurrenceInterval {
                        Label(interval.label, systemImage: "repeat")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.indigo.opacity(0.1))
                            .foregroundColor(.indigo)
                            .cornerRadius(6)
                    }
                }
            }
            
            Spacer()
            
            Button(role: .destructive, action: onDelete) {
                Image(systemName: "trash")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(16)
    }
}

// MARK: - Add Reminder Sheet

struct AddReminderSheet: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var remindersViewModel: RemindersViewModel
    @Environment(\.dismiss) var dismiss
    
    @State private var title = ""
    @State private var description = ""
    @State private var dateTime = Date().addingTimeInterval(3600) // 1 hour from now
    @State private var isRecurring = false
    @State private var recurrenceInterval: RecurrenceInterval = .daily
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                Section {
                    DatePicker("Date & Time", selection: $dateTime)
                }
                
                Section {
                    Toggle("Recurring", isOn: $isRecurring)
                    
                    if isRecurring {
                        Picker("Repeat", selection: $recurrenceInterval) {
                            ForEach(RecurrenceInterval.allCases, id: \.self) { interval in
                                Text(interval.label).tag(interval)
                            }
                        }
                    }
                }
            }
            .navigationTitle("New Reminder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    private func save() {
        guard let userId = authViewModel.currentUser?.id else { return }
        
        remindersViewModel.addReminder(
            title: title,
            description: description,
            dateTime: dateTime,
            isRecurring: isRecurring,
            recurrenceInterval: isRecurring ? recurrenceInterval : nil,
            userId: userId
        )
    }
}

#Preview {
    RemindersView()
        .environmentObject(AuthViewModel())
        .environmentObject(RemindersViewModel())
}
