//
//  ChatMessage.swift
//  LifeLogAI
//
//  Represents a message in the AI chat/search interface.
//

import Foundation

enum MessageRole: String, Codable {
    case user
    case assistant
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    var role: MessageRole
    var content: String
    let timestamp: Date
    
    /// Optional: The query that triggered this response (for assistant messages)
    var relatedQuery: String?
    
    init(role: MessageRole, content: String) {
        self.id = UUID().uuidString
        self.role = role
        self.content = content
        self.timestamp = Date()
    }
}
