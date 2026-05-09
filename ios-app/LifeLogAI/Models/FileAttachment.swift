//
//  FileAttachment.swift
//  LifeLogAI
//
//  Represents an uploaded file (PDF, image) for bill tracking,
//  backup, or OCR processing.
//

import Foundation

enum FileType: String, Codable {
    case pdf
    case image
    
    var icon: String {
        switch self {
        case .pdf: return "doc.fill"
        case .image: return "photo.fill"
        }
    }
}

struct FileAttachment: Codable, Identifiable {
    let id: String
    let userId: String
    var fileName: String
    var fileType: FileType
    var localURL: String      // Local file path on device
    var cloudURL: String?     // Optional cloud storage URL
    var thumbnailURL: String?
    let createdAt: Date
    
    /// OCR/AI extracted text from the document
    var extractedText: String?
    
    /// AI-classified document type (e.g., "Bill", "Receipt", "Document")
    var documentCategory: String?
    
    /// Amount extracted from receipt/bill (if applicable)
    var extractedAmount: Double?
    
    init(userId: String, fileName: String, fileType: FileType, localURL: String) {
        self.id = UUID().uuidString
        self.userId = userId
        self.fileName = fileName
        self.fileType = fileType
        self.localURL = localURL
        self.createdAt = Date()
    }
    
    /// Check if OCR has been performed
    var hasOCRResult: Bool {
        extractedText != nil && !extractedText!.isEmpty
    }
}
