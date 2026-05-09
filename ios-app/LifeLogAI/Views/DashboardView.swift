//
//  DashboardView.swift
//  LifeLogAI
//
//  Shows aggregated stats, charts, and AI insights.
//

import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var logViewModel: LogViewModel
    @EnvironmentObject var dashboardViewModel: DashboardViewModel
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Top stats grid
                    statsGrid
                    
                    // Sleep chart
                    sleepChartCard
                    
                    // Steps chart
                    stepsChartCard
                    
                    // Expense breakdown
                    expenseBreakdownCard
                    
                    // AI Insights
                    aiInsightsCard
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .task {
                await dashboardViewModel.refresh(using: logViewModel)
            }
            .refreshable {
                await dashboardViewModel.refresh(using: logViewModel)
            }
        }
    }
    
    // MARK: - Stats Grid
    
    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(
                icon: "dollarsign.circle.fill",
                label: "Spent Today",
                value: "$\(dashboardViewModel.summary?.totalExpensesToday ?? 0, specifier: "%.2f")",
                subtitle: "$\(Int(dashboardViewModel.summary?.totalExpensesWeek ?? 0)) this week",
                color: .red
            )
            
            StatCard(
                icon: "fork.knife",
                label: "Meals Today",
                value: "\(dashboardViewModel.summary?.mealsToday ?? 0)",
                subtitle: "~\(dashboardViewModel.summary?.caloriesToday ?? 0) cal",
                color: .orange
            )
            
            StatCard(
                icon: "moon.fill",
                label: "Sleep",
                value: "\(dashboardViewModel.summary?.sleepHoursToday ?? 0, specifier: "%.1f")h",
                subtitle: sleepSubtitle,
                color: .purple
            )
            
            StatCard(
                icon: "figure.walk",
                label: "Steps",
                value: "\((dashboardViewModel.summary?.stepsToday ?? 0).formatted())",
                subtitle: stepsSubtitle,
                color: .green
            )
        }
    }
    
    private var sleepSubtitle: String {
        guard let hours = dashboardViewModel.summary?.sleepHoursToday else { return "Not logged" }
        if hours >= 7 { return "Well rested 😊" }
        if hours > 0 { return "Could improve 😐" }
        return "Not logged"
    }
    
    private var stepsSubtitle: String {
        let steps = dashboardViewModel.summary?.stepsToday ?? 0
        if steps >= 10000 { return "Goal reached! 🎉" }
        let remaining = max(0, 10000 - steps)
        return "\(remaining.formatted()) to goal"
    }
    
    // MARK: - Sleep Chart
    
    private var sleepChartCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Sleep (Last 7 Days)", systemImage: "moon.fill")
                .font(.headline)
                .foregroundColor(.purple)
            
            if dashboardViewModel.sleepChartData.isEmpty || dashboardViewModel.sleepChartData.allSatisfy({ $0.value == 0 }) {
                Text("No sleep data yet. Log your sleep to see trends!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 40)
            } else {
                Chart(dashboardViewModel.sleepChartData) { point in
                    AreaMark(
                        x: .value("Day", point.label),
                        y: .value("Hours", point.value)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.purple.opacity(0.3), .purple.opacity(0.05)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Day", point.label),
                        y: .value("Hours", point.value)
                    )
                    .foregroundStyle(.purple)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
                .frame(height: 150)
                .chartYScale(domain: 0...12)
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(20)
    }
    
    // MARK: - Steps Chart
    
    private var stepsChartCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Steps (Last 7 Days)", systemImage: "figure.walk")
                .font(.headline)
                .foregroundColor(.green)
            
            if dashboardViewModel.stepsChartData.isEmpty || dashboardViewModel.stepsChartData.allSatisfy({ $0.value == 0 }) {
                Text("No activity data yet. Log your steps!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 40)
            } else {
                Chart(dashboardViewModel.stepsChartData) { point in
                    BarMark(
                        x: .value("Day", point.label),
                        y: .value("Steps", point.value)
                    )
                    .foregroundStyle(.green.gradient)
                    .cornerRadius(6)
                }
                .frame(height: 150)
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(20)
    }
    
    // MARK: - Expense Breakdown
    
    private var expenseBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Expenses This Week", systemImage: "dollarsign.circle.fill")
                .font(.headline)
                .foregroundColor(.red)
            
            if dashboardViewModel.expensesByCategory.isEmpty {
                Text("No expenses logged this week.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                ForEach(dashboardViewModel.expensesByCategory) { category in
                    HStack {
                        Circle()
                            .fill(categoryColor(for: category.name))
                            .frame(width: 12, height: 12)
                        Text(category.name)
                            .font(.subheadline)
                        Spacer()
                        Text("$\(category.amount, specifier: "%.0f")")
                            .font(.subheadline.bold())
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(20)
    }
    
    private func categoryColor(for name: String) -> Color {
        let colors: [Color] = [.indigo, .red, .orange, .green, .purple, .pink, .cyan, .gray]
        let index = abs(name.hashValue) % colors.count
        return colors[index]
    }
    
    // MARK: - AI Insights
    
    private var aiInsightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("AI Insights", systemImage: "sparkles")
                .font(.headline)
                .foregroundColor(.indigo)
            
            ForEach(dashboardViewModel.aiInsights, id: \.self) { insight in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(.yellow)
                        .font(.caption)
                    Text(insight)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            
            Text("✨ More insights coming with Gemini AI integration")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.indigo.opacity(0.05), Color.purple.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(20)
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let icon: String
    let label: String
    let value: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(label)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(value)
                .font(.title2.bold())
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.regularMaterial)
        .cornerRadius(16)
    }
}

#Preview {
    DashboardView()
        .environmentObject(LogViewModel())
        .environmentObject(DashboardViewModel())
}
