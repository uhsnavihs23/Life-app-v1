//
//  TodayView.swift
//  LifeLogAI
//
//  Main daily logging screen where users can:
//  - Add free-text journal entries
//  - Quick-add expenses, food, sleep, activity
//  - See today's entries feed
//

import SwiftUI

struct TodayView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var logViewModel: LogViewModel
    
    @State private var logText: String = ""
    @State private var selectedTag: EntryTag = .general
    @State private var showQuickAdd: QuickAddType?
    
    enum QuickAddType: String, CaseIterable, Identifiable {
        case expense, food, sleep, activity
        var id: String { rawValue }
        
        var icon: String {
            switch self {
            case .expense: return "dollarsign.circle.fill"
            case .food: return "fork.knife"
            case .sleep: return "moon.fill"
            case .activity: return "figure.walk"
            }
        }
        
        var color: Color {
            switch self {
            case .expense: return .red
            case .food: return .orange
            case .sleep: return .purple
            case .activity: return .green
            }
        }
        
        var title: String { rawValue.capitalized }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Date header
                    Text(Date(), format: .dateTime.weekday(.wide).month().day().year())
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    // Quick stats
                    quickStatsView
                    
                    // Log entry input
                    logEntryView
                    
                    // Quick add buttons
                    quickAddButtons
                    
                    // Today's feed
                    todaysFeedView
                }
                .padding()
            }
            .navigationTitle("Today")
            .sheet(item: $showQuickAdd) { type in
                QuickAddSheet(type: type)
            }
        }
    }
    
    // MARK: - Quick Stats
    
    private var quickStatsView: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
            StatMiniCard(label: "Entries", value: "\(logViewModel.todayLogs.count + logViewModel.todayExpenses.count + logViewModel.todayFood.count)", color: .indigo)
            StatMiniCard(label: "Spent", value: "$\(Int(logViewModel.totalExpensesToday))", color: .red)
            StatMiniCard(label: "Meals", value: "\(logViewModel.todayFood.count)", color: .orange)
            StatMiniCard(label: "Steps", value: "\(logViewModel.stepsToday)", color: .green)
        }
    }
    
    // MARK: - Log Entry
    
    private var logEntryView: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top) {
                TextField("What's happening today?", text: $logText, axis: .vertical)
                    .lineLimit(3...6)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                
                Button {
                    submitLog()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.indigo)
                }
                .disabled(logText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            
            // Tag selector
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(EntryTag.allCases, id: \.self) { tag in
                        TagChip(tag: tag, isSelected: selectedTag == tag) {
                            selectedTag = tag
                        }
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(20)
    }
    
    // MARK: - Quick Add Buttons
    
    private var quickAddButtons: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
            ForEach(QuickAddType.allCases) { type in
                Button {
                    showQuickAdd = type
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: type.icon)
                            .font(.title2)
                            .foregroundColor(type.color)
                        Text(type.title)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(.regularMaterial)
                    .cornerRadius(16)
                }
            }
        }
    }
    
    // MARK: - Today's Feed
    
    private var todaysFeedView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Feed")
                .font(.headline)
            
            if allTodayItems.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "text.badge.plus")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("No entries yet today")
                        .foregroundColor(.secondary)
                    Text("Start logging above!")
                        .font(.caption)
                        .foregroundColor(.secondary.opacity(0.7))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ForEach(allTodayItems.prefix(10)) { item in
                    FeedItemCard(item: item)
                }
            }
        }
    }
    
    // MARK: - Helpers
    
    private var allTodayItems: [FeedItem] {
        var items: [FeedItem] = []
        
        items += logViewModel.todayLogs.map { FeedItem(id: $0.id, text: $0.text, tag: $0.tag, date: $0.createdAt) }
        items += logViewModel.todayExpenses.map { FeedItem(id: $0.id, text: "$\($0.amount, specifier: "%.2f") - \($0.category)", tag: .expense, date: $0.createdAt) }
        items += logViewModel.todayFood.map { FeedItem(id: $0.id, text: $0.displayText, tag: .food, date: $0.createdAt) }
        items += logViewModel.todaySleep.map { FeedItem(id: $0.id, text: $0.displayText, tag: .sleep, date: $0.createdAt) }
        items += logViewModel.todayActivity.map { FeedItem(id: $0.id, text: $0.displayText, tag: .exercise, date: $0.createdAt) }
        
        return items.sorted { $0.date > $1.date }
    }
    
    private func submitLog() {
        guard !logText.trimmingCharacters(in: .whitespaces).isEmpty,
              let userId = authViewModel.currentUser?.id else { return }
        
        Task {
            await logViewModel.addLog(text: logText, tag: selectedTag, userId: userId)
            logText = ""
        }
    }
}

// MARK: - Supporting Views

struct StatMiniCard: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.headline)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.regularMaterial)
        .cornerRadius(12)
    }
}

struct TagChip: View {
    let tag: EntryTag
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(tag.label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color(hex: tag.color).opacity(0.2) : Color(.systemGray6))
                .foregroundColor(isSelected ? Color(hex: tag.color) : .secondary)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? Color(hex: tag.color) : .clear, lineWidth: 1.5)
                )
        }
    }
}

struct FeedItem: Identifiable {
    let id: String
    let text: String
    let tag: EntryTag
    let date: Date
}

struct FeedItemCard: View {
    let item: FeedItem
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(item.tag.emoji)
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(Color(hex: item.tag.color).opacity(0.15))
                .cornerRadius(10)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(item.text)
                    .font(.subheadline)
                
                HStack {
                    Text(item.tag.label)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(hex: item.tag.color).opacity(0.1))
                        .foregroundColor(Color(hex: item.tag.color))
                        .cornerRadius(10)
                    
                    Text(item.date, format: .dateTime.hour().minute())
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(16)
    }
}

#Preview {
    TodayView()
        .environmentObject(AuthViewModel())
        .environmentObject(LogViewModel())
}
