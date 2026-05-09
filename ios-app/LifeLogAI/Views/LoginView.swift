//
//  LoginView.swift
//  LifeLogAI
//
//  Simple login screen with email/username and password fields.
//  No real authentication - accepts any non-empty credentials.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    @State private var loginId: String = ""
    @State private var password: String = ""
    @State private var showPassword: Bool = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(hex: "667eea"), Color(hex: "764ba2")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                // Logo and title
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundColor(.white)
                        .padding(24)
                        .background(.white.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                    
                    Text("LifeLog AI")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Your personal life dashboard")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
                
                // Login card
                VStack(spacing: 20) {
                    Text("Welcome Back")
                        .font(.title2.bold())
                    
                    // Error message
                    if let error = authViewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                    // Login ID field
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email or Username")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        TextField("you@example.com", text: $loginId)
                            .textContentType(.username)
                            .autocapitalization(.none)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }
                    
                    // Password field
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            if showPassword {
                                TextField("Enter password", text: $password)
                            } else {
                                SecureField("Enter password", text: $password)
                            }
                            
                            Button {
                                showPassword.toggle()
                            } label: {
                                Image(systemName: showPassword ? "eye.slash" : "eye")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Login button
                    Button {
                        Task {
                            await authViewModel.login(loginId: loginId, password: password)
                        }
                    } label: {
                        HStack {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: "6366f1"))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(authViewModel.isLoading)
                    
                    Text("Demo mode — any credentials will work")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(24)
                .background(.regularMaterial)
                .cornerRadius(24)
                .padding(.horizontal)
                
                Spacer()
                
                Text("LifeLog AI v1.0")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.4))
            }
        }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthViewModel())
}
