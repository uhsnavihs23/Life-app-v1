//
//  AuthViewModel.swift
//  LifeLogAI
//
//  Manages authentication state and user profile.
//  Uses @Published properties for SwiftUI reactivity.
//

import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let authService = AuthService.shared
    private let storage = StorageService.shared
    
    init() {
        // Check for existing session
        if let user = authService.getCurrentUser() {
            self.currentUser = user
            self.isLoggedIn = true
        }
    }
    
    // MARK: - Login
    
    func login(loginId: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        let result = await authService.login(loginId: loginId, password: password)
        
        isLoading = false
        
        switch result {
        case .success(let user):
            currentUser = user
            isLoggedIn = true
            
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Logout
    
    func logout() {
        authService.logout()
        currentUser = nil
        isLoggedIn = false
    }
    
    // MARK: - Update Profile
    
    func updateProfile(displayName: String, email: String) {
        authService.updateProfile(displayName: displayName, email: email)
        currentUser = authService.getCurrentUser()
    }
    
    // MARK: - Clear All Data
    
    func clearAllData() {
        storage.clearAllData()
        logout()
    }
}
