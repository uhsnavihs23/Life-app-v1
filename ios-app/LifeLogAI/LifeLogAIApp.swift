//
//  LifeLogAIApp.swift
//  LifeLogAI
//
//  Main entry point for the app.
//  This file sets up the app structure and injects shared ViewModels.
//

import SwiftUI

@main
struct LifeLogAIApp: App {
    // Shared state objects that persist across the app
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var logViewModel = LogViewModel()
    @StateObject private var dashboardViewModel = DashboardViewModel()
    @StateObject private var remindersViewModel = RemindersViewModel()
    
    init() {
        // Request notification permissions on launch
        NotificationService.shared.requestPermissions()
    }
    
    var body: some Scene {
        WindowGroup {
            // Show login if not authenticated, otherwise show main app
            if authViewModel.isLoggedIn {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(logViewModel)
                    .environmentObject(dashboardViewModel)
                    .environmentObject(remindersViewModel)
            } else {
                LoginView()
                    .environmentObject(authViewModel)
            }
        }
    }
}
