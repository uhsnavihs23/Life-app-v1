//
//  FilesView.swift
//  LifeLogAI
//
//  Upload and manage PDFs and images.
//  OCR extraction using Gemini AI.
//

import SwiftUI
import PhotosUI

struct FilesView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = FilesViewModel()
    
    @State private var showImagePicker = false
    @State private var showCamera = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.selectedFile != nil {
                    fileDetailView
                } else {
                    fileListView
                }
            }
            .navigationTitle(viewModel.selectedFile != nil ? "File Details" : "Files & Bills")
            .toolbar {
                if viewModel.selectedFile != nil {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Back") {
                            viewModel.clearSelection()
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - File List
    
    private var fileListView: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Upload buttons
                HStack(spacing: 12) {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        VStack(spacing: 8) {
                            Image(systemName: "photo.on.rectangle.angled")
                                .font(.title)
                                .foregroundColor(.indigo)
                            Text("Upload Image")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(.regularMaterial)
                        .cornerRadius(16)
                    }
                    .onChange(of: selectedPhotoItem) { _, newValue in
                        if let item = newValue {
                            Task {
                                if let userId = authViewModel.currentUser?.id {
                                    await viewModel.processImage(from: item, userId: userId)
                                    selectedPhotoItem = nil
                                }
                            }
                        }
                    }
                    
                    Button {
                        showCamera = true
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: "camera.fill")
                                .font(.title)
                                .foregroundColor(.green)
                            Text("Take Photo")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                        .background(.regularMaterial)
                        .cornerRadius(16)
                    }
                }
                
                // File list
                VStack(alignment: .leading, spacing: 12) {
                    Text("Your Files (\(viewModel.files.count))")
                        .font(.headline)
                    
                    if viewModel.files.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "folder")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                            Text("No files yet")
                                .foregroundColor(.secondary)
                            Text("Upload a PDF or take a photo")
                                .font(.caption)
                                .foregroundColor(.secondary.opacity(0.7))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        ForEach(viewModel.files) { file in
                            FileRow(file: file) {
                                viewModel.selectFile(file)
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }
    
    // MARK: - File Detail
    
    private var fileDetailView: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let file = viewModel.selectedFile {
                    // File info
                    VStack(alignment: .leading, spacing: 8) {
                        Text(file.fileName)
                            .font(.title2.bold())
                        
                        Text("\(file.createdAt, format: .dateTime) · \(file.fileType.rawValue.uppercased())")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    // Preview
                    if file.fileType == .image, let data = StorageService.shared.loadFile(fileName: URL(fileURLWithPath: file.localURL).lastPathComponent),
                       let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 300)
                            .cornerRadius(12)
                    } else {
                        VStack(spacing: 12) {
                            Image(systemName: file.fileType == .pdf ? "doc.fill" : "photo.fill")
                                .font(.system(size: 60))
                                .foregroundColor(file.fileType == .pdf ? .red : .blue)
                            Text(file.fileType == .pdf ? "PDF Document" : "Image")
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // OCR Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Label("Extracted Text / OCR", systemImage: "sparkles")
                                .font(.headline)
                                .foregroundColor(.indigo)
                            
                            Spacer()
                            
                            if file.extractedText == nil {
                                Button {
                                    Task {
                                        await viewModel.extractText(from: file)
                                    }
                                } label: {
                                    if viewModel.isLoading {
                                        ProgressView()
                                    } else {
                                        Label("Extract", systemImage: "sparkles")
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.indigo)
                            }
                        }
                        
                        if let text = viewModel.ocrResult ?? file.extractedText {
                            Text(text)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        } else {
                            Text("Click \"Extract\" to use AI/OCR to read text from this document.")
                                .font(.subheadline)
                                .italic()
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                    
                    // Delete button
                    Button(role: .destructive) {
                        viewModel.deleteFile(file.id)
                    } label: {
                        Label("Delete File", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
        }
    }
}

// MARK: - File Row

struct FileRow: View {
    let file: FileAttachment
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Thumbnail
                if file.fileType == .image, let data = StorageService.shared.loadFile(fileName: URL(fileURLWithPath: file.localURL).lastPathComponent),
                   let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 48)
                        .cornerRadius(8)
                } else {
                    Image(systemName: file.fileType == .pdf ? "doc.fill" : "photo.fill")
                        .font(.title2)
                        .foregroundColor(file.fileType == .pdf ? .red : .blue)
                        .frame(width: 48, height: 48)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(file.fileName)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    
                    HStack {
                        Text(file.fileType.rawValue.uppercased())
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(file.fileType == .pdf ? Color.red.opacity(0.1) : Color.blue.opacity(0.1))
                            .foregroundColor(file.fileType == .pdf ? .red : .blue)
                            .cornerRadius(4)
                        
                        Text(file.createdAt, format: .dateTime.month().day().hour().minute())
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if file.hasOCRResult {
                    Image(systemName: "sparkles")
                        .foregroundColor(.indigo)
                }
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(.regularMaterial)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    FilesView()
        .environmentObject(AuthViewModel())
}
