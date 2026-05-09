//
//  FilesViewModel.swift
//  LifeLogAI
//
//  Manages file attachments (PDFs, images) and OCR extraction.
//

import Foundation
import SwiftUI
import PhotosUI

@MainActor
class FilesViewModel: ObservableObject {
    @Published var files: [FileAttachment] = []
    @Published var selectedFile: FileAttachment?
    @Published var isLoading: Bool = false
    @Published var ocrResult: String?
    
    private let storage = StorageService.shared
    private let gemini = GeminiService.shared
    
    init() {
        loadFiles()
    }
    
    // MARK: - Load/Save
    
    func loadFiles() {
        files = storage.loadFiles()
    }
    
    private func saveFiles() {
        storage.saveFiles(files)
    }
    
    // MARK: - Add File
    
    func addFile(data: Data, fileName: String, type: FileType, userId: String) {
        // Generate unique filename
        let uniqueName = "\(UUID().uuidString)_\(fileName)"
        
        // Save file to documents directory
        guard let fileURL = storage.saveFile(data: data, fileName: uniqueName) else {
            print("Failed to save file")
            return
        }
        
        let attachment = FileAttachment(
            userId: userId,
            fileName: fileName,
            fileType: type,
            localURL: fileURL.path
        )
        
        files.insert(attachment, at: 0)
        saveFiles()
    }
    
    // MARK: - Process Image from PhotosUI
    
    func processImage(from item: PhotosPickerItem, userId: String) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else {
            return
        }
        
        let fileName = "image_\(Date().timeIntervalSince1970).jpg"
        addFile(data: data, fileName: fileName, type: .image, userId: userId)
    }
    
    // MARK: - Extract Text (OCR)
    
    func extractText(from file: FileAttachment) async {
        guard file.fileType == .image else {
            ocrResult = "OCR is currently only supported for images."
            return
        }
        
        isLoading = true
        
        // Load image data
        if let data = storage.loadFile(fileName: URL(fileURLWithPath: file.localURL).lastPathComponent) {
            let text = await gemini.extractText(from: data)
            
            // Update file with extracted text
            if let index = files.firstIndex(where: { $0.id == file.id }) {
                files[index].extractedText = text
                saveFiles()
                
                // Update selected file
                selectedFile = files[index]
            }
            
            ocrResult = text
        } else {
            ocrResult = "Could not load file for OCR."
        }
        
        isLoading = false
    }
    
    // MARK: - Delete File
    
    func deleteFile(_ id: String) {
        if let file = files.first(where: { $0.id == id }) {
            // Delete from disk
            storage.deleteFile(fileName: URL(fileURLWithPath: file.localURL).lastPathComponent)
        }
        
        files.removeAll { $0.id == id }
        saveFiles()
        selectedFile = nil
    }
    
    // MARK: - Select File
    
    func selectFile(_ file: FileAttachment) {
        selectedFile = file
        ocrResult = file.extractedText
    }
    
    func clearSelection() {
        selectedFile = nil
        ocrResult = nil
    }
}
