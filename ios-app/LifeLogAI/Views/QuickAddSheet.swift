//
//  QuickAddSheet.swift
//  LifeLogAI
//
//  Bottom sheet forms for quickly adding expenses, food, sleep, and activity.
//

import SwiftUI

struct QuickAddSheet: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var logViewModel: LogViewModel
    @Environment(\.dismiss) var dismiss
    
    let type: TodayView.QuickAddType
    
    // Expense form
    @State private var expenseAmount: String = ""
    @State private var expenseCategory: String = "Food & Dining"
    @State private var expenseNote: String = ""
    
    // Food form
    @State private var foodName: String = ""
    @State private var foodPortion: String = ""
    @State private var foodCalories: String = ""
    @State private var foodMeal: MealType = .lunch
    
    // Sleep form
    @State private var sleepHours: Double = 7.0
    @State private var sleepQuality: SleepQuality = .good
    
    // Activity form
    @State private var activitySteps: String = ""
    @State private var activityDistance: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                switch type {
                case .expense:
                    expenseForm
                case .food:
                    foodForm
                case .sleep:
                    sleepForm
                case .activity:
                    activityForm
                }
            }
            .navigationTitle("Add \(type.title)")
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
                    .disabled(!isValid)
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    // MARK: - Expense Form
    
    private var expenseForm: some View {
        Group {
            Section {
                HStack {
                    Text("$")
                    TextField("Amount", text: $expenseAmount)
                        .keyboardType(.decimalPad)
                }
                
                Picker("Category", selection: $expenseCategory) {
                    ForEach(Config.expenseCategories, id: \.self) { category in
                        Text(category).tag(category)
                    }
                }
                
                TextField("Note (optional)", text: $expenseNote)
            }
        }
    }
    
    // MARK: - Food Form
    
    private var foodForm: some View {
        Group {
            Section {
                TextField("Food name", text: $foodName)
                TextField("Portion size (e.g., 1 cup)", text: $foodPortion)
                TextField("Calories (optional)", text: $foodCalories)
                    .keyboardType(.numberPad)
                
                Picker("Meal", selection: $foodMeal) {
                    ForEach(MealType.allCases, id: \.self) { meal in
                        Text("\(meal.emoji) \(meal.label)").tag(meal)
                    }
                }
            }
        }
    }
    
    // MARK: - Sleep Form
    
    private var sleepForm: some View {
        Group {
            Section {
                VStack(alignment: .leading) {
                    Text("Hours: \(sleepHours, specifier: "%.1f")")
                    Slider(value: $sleepHours, in: 1...14, step: 0.5)
                        .tint(.purple)
                }
                
                Picker("Quality", selection: $sleepQuality) {
                    ForEach(SleepQuality.allCases, id: \.self) { quality in
                        Text("\(quality.emoji) \(quality.label)").tag(quality)
                    }
                }
                .pickerStyle(.segmented)
            }
        }
    }
    
    // MARK: - Activity Form
    
    private var activityForm: some View {
        Group {
            Section {
                TextField("Number of steps", text: $activitySteps)
                    .keyboardType(.numberPad)
                TextField("Distance in km (optional)", text: $activityDistance)
                    .keyboardType(.decimalPad)
            }
            
            Section {
                Text("Tip: Enable HealthKit in Settings for automatic step tracking!")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // MARK: - Validation
    
    private var isValid: Bool {
        guard let userId = authViewModel.currentUser?.id, !userId.isEmpty else { return false }
        
        switch type {
        case .expense:
            return Double(expenseAmount) != nil && Double(expenseAmount)! > 0
        case .food:
            return !foodName.trimmingCharacters(in: .whitespaces).isEmpty
        case .sleep:
            return sleepHours > 0
        case .activity:
            return Int(activitySteps) != nil && Int(activitySteps)! > 0
        }
    }
    
    // MARK: - Save
    
    private func save() {
        guard let userId = authViewModel.currentUser?.id else { return }
        
        switch type {
        case .expense:
            if let amount = Double(expenseAmount) {
                logViewModel.addExpense(amount: amount, category: expenseCategory, note: expenseNote, userId: userId)
            }
            
        case .food:
            let calories = Int(foodCalories)
            let portion = foodPortion.isEmpty ? "1 serving" : foodPortion
            logViewModel.addFood(name: foodName, portionSize: portion, calories: calories, mealType: foodMeal, userId: userId)
            
        case .sleep:
            logViewModel.addSleep(hours: sleepHours, quality: sleepQuality, userId: userId)
            
        case .activity:
            if let steps = Int(activitySteps) {
                let distance = Double(activityDistance)
                logViewModel.addActivity(steps: steps, distanceKm: distance, userId: userId)
            }
        }
    }
}

#Preview {
    QuickAddSheet(type: .expense)
        .environmentObject(AuthViewModel())
        .environmentObject(LogViewModel())
}
