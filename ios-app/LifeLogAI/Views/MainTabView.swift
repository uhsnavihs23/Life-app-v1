//
//  MainTabView.swift
//  LifeLogAI
//
//  Main navigation with bottom tab bar.
//  Contains all the main screens of the app.
//

import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .today
    
    enum Tab: String, CaseIterable {
        case today = "Today"
        case dashboard = "Dashboard"
        case files = "Files"
        case reminders = "Reminders"
        case search = "AI"
        case profile = "Profile"
        
        var icon: String {
            switch self {
            case .today: return "square.and.pencil"
            case .dashboard: return "chart.bar.fill"
            case .files: return "folder.fill"
            case .reminders: return "bell.fill"
            case .search: return "sparkles"
            case .profile: return "person.circle.fill"
            }
        }
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label(Tab.today.rawValue, systemImage: Tab.today.icon)
                }
                .tag(Tab.today)
            
            DashboardView()
                .tabItem {
                    Label(Tab.dashboard.rawValue, systemImage: Tab.dashboard.icon)
                }
                .tag(Tab.dashboard)
            
            FilesView()
                .tabItem {
                    Label(Tab.files.rawValue, systemImage: Tab.files.icon)
                }
                .tag(Tab.files)
            
            RemindersView()
                .tabItem {
                    Label(Tab.reminders.rawValue, systemImage: Tab.reminders.icon)
                }
                .tag(Tab.reminders)
            
            SearchView()
                .tabItem {
                    Label(Tab.search.rawValue, systemImage: Tab.search.icon)
                }
                .tag(Tab.search)
            
            ProfileView()
                .tabItem {
                    Label(Tab.profile.rawValue, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
        }
        .tint(Color(hex: "6366f1"))
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthViewModel())
        .environmentObject(LogViewModel())
        .environmentObject(DashboardViewModel())
        .environmentObject(RemindersViewModel())
}
