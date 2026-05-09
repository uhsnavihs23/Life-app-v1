//
//  User.swift
//  LifeLogAI
//
//  Represents a user profile in the app.
//  Stored locally and synced to Google Sheets.
//

import Foundation

struct User: Codable, Identifiable {
    let id: String
    var username: String
    var email: String
    var displayName: String
    var avatarURL: String?
    let createdAt: Date
    
    // Create a new user
    init(username: String, email: String, displayName: String) {
        self.id = UUID().uuidString
        self.username = username
        self.email = email
        self.displayName = displayName
        self.createdAt = Date()
    }
    
    // For decoding from storage
    init(id: String, username: String, email: String, displayName: String, avatarURL: String?, createdAt: Date) {
        self.id = id
        self.username = username
        self.email = email
        self.displayName = displayName
        self.avatarURL = avatarURL
        self.createdAt = createdAt
    }
}
