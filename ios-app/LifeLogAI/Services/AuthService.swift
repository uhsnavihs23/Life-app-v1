//
//  AuthService.swift
//  LifeLogAI
//
//  Handles user authentication.
//  Currently uses local storage (no backend).
//
//  TO ADD REAL AUTHENTICATION:
//  1. Firebase Auth: Import FirebaseAuth, use Auth.auth().signIn()
//  2. Custom Backend: Replace login() with API call to your server
//  3. Keychain: Store passwords securely using KeychainAccess library
//

import Foundation

class AuthService {
    static let shared = AuthService()
    private let storage = StorageService.shared
    
    private init() {}
    
    // MARK: - Authentication
    
    /// Login with username/email and password
    /// Returns a Result with User on success or error message on failure
    func login(loginId: String, password: String) async -> Result<User, AuthError> {
        // Validate inputs
        guard !loginId.trimmingCharacters(in: .whitespaces).isEmpty else {
            return .failure(.emptyLoginId)
        }
        guard !password.isEmpty else {
            return .failure(.emptyPassword)
        }
        
        // Simulate network delay (remove this when using real auth)
        try? await Task.sleep(nanoseconds: 500_000_000)
        
        // For demo: Accept any non-empty credentials
        // In production, validate against your backend
        let email = loginId.contains("@") ? loginId : "\(loginId)@example.com"
        let displayName = loginId.components(separatedBy: "@").first ?? loginId
        
        let user = User(
            username: loginId.trimmingCharacters(in: .whitespaces),
            email: email,
            displayName: displayName.capitalized
        )
        
        // Save user locally
        storage.saveUser(user)
        
        return .success(user)
    }
    
    /// Check if a user is currently logged in
    func getCurrentUser() -> User? {
        return storage.loadUser()
    }
    
    /// Log out the current user
    func logout() {
        storage.clearUser()
        // Note: We don't clear all data on logout,
        // so user can log back in and see their data
    }
    
    /// Check if user is logged in
    var isLoggedIn: Bool {
        return getCurrentUser() != nil
    }
    
    /// Update user profile
    func updateProfile(displayName: String, email: String) {
        guard var user = getCurrentUser() else { return }
        user.displayName = displayName
        user.email = email
        storage.saveUser(user)
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case emptyLoginId
    case emptyPassword
    case invalidCredentials
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .emptyLoginId:
            return "Please enter your login ID or email."
        case .emptyPassword:
            return "Please enter your password."
        case .invalidCredentials:
            return "Invalid login credentials."
        case .networkError:
            return "Network error. Please try again."
        }
    }
}
