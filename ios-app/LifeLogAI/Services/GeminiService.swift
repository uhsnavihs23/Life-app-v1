//
//  GeminiService.swift
//  LifeLogAI
//
//  Integrates with Google's Gemini API for:
//  - Classifying free-text log entries into structured data
//  - Analyzing food intake and providing nutritional insights
//  - OCR/text extraction from images and PDFs
//  - Answering search queries about user data or general facts
//
//  API Documentation: https://ai.google.dev/docs
//  Free Tier: 15 requests/minute, 1M tokens/month
//

import Foundation

class GeminiService {
    static let shared = GeminiService()
    
    private let apiKey = Config.geminiAPIKey
    private let model = Config.geminiModel
    private let baseURL = Config.geminiBaseURL
    
    private init() {}
    
    // MARK: - API Request
    
    private func makeRequest(prompt: String) async throws -> String {
        let endpoint = "\(baseURL)/models/\(model):generateContent?key=\(apiKey)"
        
        guard let url = URL(string: endpoint) else {
            throw GeminiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": prompt]
                    ]
                ]
            ],
            "generationConfig": [
                "temperature": 0.7,
                "maxOutputTokens": 1024
            ]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw GeminiError.apiError(statusCode: httpResponse.statusCode)
        }
        
        // Parse response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let firstCandidate = candidates.first,
              let content = firstCandidate["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let firstPart = parts.first,
              let text = firstPart["text"] as? String else {
            throw GeminiError.parsingError
        }
        
        return text
    }
    
    // MARK: - Log Classification
    
    /// Classify a free-text log entry into structured data
    /// Returns a dictionary with type, confidence, and extracted data
    func classifyLog(text: String) async -> ClassificationResult {
        // Check if API key is configured
        guard apiKey != "YOUR_GEMINI_API_KEY_HERE" else {
            // Return mock data for demo
            return mockClassifyLog(text: text)
        }
        
        let prompt = """
        Analyze this personal log entry and classify it. Return a JSON object with:
        - type: one of "general", "expense", "food", "sleep", "exercise", "note"
        - confidence: a number between 0 and 1
        - extractedData: any relevant structured data you can extract
        
        Log entry: "\(text)"
        
        Respond with only the JSON object, no markdown.
        """
        
        do {
            let response = try await makeRequest(prompt: prompt)
            // Parse the JSON response
            if let data = response.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let type = json["type"] as? String ?? "general"
                let confidence = json["confidence"] as? Double ?? 0.5
                let extractedData = json["extractedData"] as? [String: Any] ?? [:]
                return ClassificationResult(type: type, confidence: confidence, extractedData: extractedData)
            }
        } catch {
            print("GeminiService classifyLog error: \(error)")
        }
        
        return mockClassifyLog(text: text)
    }
    
    /// Mock classification for demo mode
    private func mockClassifyLog(text: String) -> ClassificationResult {
        let lower = text.lowercased()
        
        if lower.contains("spent") || lower.contains("paid") || lower.contains("$") || lower.contains("bought") {
            return ClassificationResult(type: "expense", confidence: 0.85, extractedData: ["suggestedCategory": "General"])
        }
        if lower.contains("ate") || lower.contains("food") || lower.contains("meal") || lower.contains("breakfast") || lower.contains("lunch") || lower.contains("dinner") {
            return ClassificationResult(type: "food", confidence: 0.80, extractedData: ["suggestedMealType": "meal"])
        }
        if lower.contains("slept") || lower.contains("sleep") || lower.contains("bed") || lower.contains("woke") {
            return ClassificationResult(type: "sleep", confidence: 0.90, extractedData: [:])
        }
        if lower.contains("walk") || lower.contains("run") || lower.contains("exercise") || lower.contains("steps") || lower.contains("gym") {
            return ClassificationResult(type: "exercise", confidence: 0.88, extractedData: [:])
        }
        
        return ClassificationResult(type: "general", confidence: 0.50, extractedData: [:])
    }
    
    // MARK: - Food Analysis
    
    /// Analyze food entries and return nutritional insights
    func analyzeFood(entries: [FoodEntry]) async -> FoodAnalysis {
        guard apiKey != "YOUR_GEMINI_API_KEY_HERE" else {
            return mockFoodAnalysis(entries: entries)
        }
        
        let foodList = entries.map { "\($0.name) (\($0.portionSize))" }.joined(separator: ", ")
        
        let prompt = """
        Analyze these food items eaten today and provide nutritional insights:
        \(foodList)
        
        Return a JSON object with:
        - estimatedCalories: total estimated calories
        - summary: a brief summary of the diet
        - suggestions: array of 2-3 health suggestions
        
        Respond with only the JSON object, no markdown.
        """
        
        do {
            let response = try await makeRequest(prompt: prompt)
            if let data = response.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                return FoodAnalysis(
                    estimatedCalories: json["estimatedCalories"] as? Int ?? 0,
                    summary: json["summary"] as? String ?? "",
                    suggestions: json["suggestions"] as? [String] ?? []
                )
            }
        } catch {
            print("GeminiService analyzeFood error: \(error)")
        }
        
        return mockFoodAnalysis(entries: entries)
    }
    
    private func mockFoodAnalysis(entries: [FoodEntry]) -> FoodAnalysis {
        let totalCalories = entries.compactMap { $0.calories }.reduce(0, +)
        return FoodAnalysis(
            estimatedCalories: totalCalories,
            summary: "You logged \(entries.count) food items today with approximately \(totalCalories) calories.",
            suggestions: [
                "Try to include more vegetables in your meals.",
                "Stay hydrated — aim for 8 glasses of water.",
                "Consider adding protein to each meal for sustained energy."
            ]
        )
    }
    
    // MARK: - Search / Chat
    
    /// Answer a search query about user data or general facts
    func search(query: String, context: String = "") async -> String {
        guard apiKey != "YOUR_GEMINI_API_KEY_HERE" else {
            return mockSearch(query: query)
        }
        
        let prompt = """
        You are a helpful AI assistant for a personal life logging app called LifeLog AI.
        The user is asking a question. If it's about their personal data, use the context provided.
        If it's a general factual question, answer it helpfully.
        
        User's data context:
        \(context)
        
        User's question: \(query)
        
        Provide a helpful, concise response.
        """
        
        do {
            return try await makeRequest(prompt: prompt)
        } catch {
            print("GeminiService search error: \(error)")
            return mockSearch(query: query)
        }
    }
    
    private func mockSearch(query: String) -> String {
        let lower = query.lowercased()
        
        if lower.contains("expense") || lower.contains("spent") || lower.contains("money") {
            return "Based on your logs, you've been tracking expenses consistently. To get detailed spending insights, make sure to log each expense with a category. Once the Gemini API is connected with your key, I'll provide personalized spending analysis!"
        }
        if lower.contains("sleep") {
            return "Sleep is important! The WHO recommends 7-9 hours for adults. Log your sleep daily to track patterns. With the Gemini API connected, I can analyze your sleep quality trends and provide personalized tips."
        }
        if lower.contains("food") || lower.contains("diet") || lower.contains("eat") || lower.contains("calories") {
            return "Good nutrition is key to wellbeing. Log your meals with portion sizes and estimated calories for better tracking. Once integrated with Gemini, I can provide nutritional analysis and meal suggestions."
        }
        if lower.contains("exercise") || lower.contains("steps") || lower.contains("fitness") || lower.contains("walk") {
            return "Great job staying active! The WHO recommends at least 150 minutes of moderate exercise weekly. Log your steps and activities to track progress. Enable HealthKit for automatic step tracking!"
        }
        
        return """
        That's a great question! I'm your LifeLog AI assistant. 
        
        To unlock full AI capabilities:
        1. Get your free Gemini API key at makersuite.google.com
        2. Add it to Config.swift
        3. Rebuild the app
        
        Then I can answer questions about your personal data, provide insights, and help with general knowledge queries!
        
        For now, try asking about: expenses, sleep, food, or exercise.
        """
    }
    
    // MARK: - OCR / Text Extraction
    
    /// Extract text from an image using Gemini's vision capabilities
    func extractText(from imageData: Data) async -> String {
        guard apiKey != "YOUR_GEMINI_API_KEY_HERE" else {
            return "OCR extraction requires a Gemini API key. Get your free key at makersuite.google.com and add it to Config.swift. Once configured, I can read text from receipts, bills, documents, and more!"
        }
        
        // For vision, we need to use gemini-1.5-flash with image
        let endpoint = "\(baseURL)/models/gemini-1.5-flash:generateContent?key=\(apiKey)"
        
        guard let url = URL(string: endpoint) else {
            return "Error: Invalid API URL"
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let base64Image = imageData.base64EncodedString()
        
        let body: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": "Extract all text from this image. If it's a receipt or bill, also identify the total amount. Format the response clearly."],
                        [
                            "inline_data": [
                                "mime_type": "image/jpeg",
                                "data": base64Image
                            ]
                        ]
                    ]
                ]
            ]
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, _) = try await URLSession.shared.data(for: request)
            
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let candidates = json["candidates"] as? [[String: Any]],
               let firstCandidate = candidates.first,
               let content = firstCandidate["content"] as? [String: Any],
               let parts = content["parts"] as? [[String: Any]],
               let firstPart = parts.first,
               let text = firstPart["text"] as? String {
                return text
            }
        } catch {
            print("GeminiService OCR error: \(error)")
        }
        
        return "Could not extract text from image. Please try again."
    }
}

// MARK: - Supporting Types

struct ClassificationResult {
    let type: String
    let confidence: Double
    let extractedData: [String: Any]
}

struct FoodAnalysis {
    let estimatedCalories: Int
    let summary: String
    let suggestions: [String]
}

enum GeminiError: LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(statusCode: Int)
    case parsingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let code):
            return "API error: \(code)"
        case .parsingError:
            return "Could not parse response"
        }
    }
}
