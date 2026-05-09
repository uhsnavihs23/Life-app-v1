/**
 * FilesTab - Document & Bill Management
 * 
 * Users can:
 * - Upload PDF files
 * - Take photos or pick images from gallery
 * - View a list of uploaded files
 * - See file details with OCR placeholder
 */

import { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService } from '../../services/GeminiService';
import { format } from 'date-fns';
import {
  Upload, Camera, FileText, Image as ImageIcon,
  ArrowLeft, Sparkles, File, Clock, Loader2
} from 'lucide-react';
import type { FileAttachment } from '../../models/types';

export default function FilesTab() {
  const { state, addFile, dispatch } = useApp();
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const isPdf = file.type === 'application/pdf';
        addFile(file.name, isPdf ? 'pdf' : 'image', url);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleExtractText = async (file: FileAttachment) => {
    setIsExtracting(true);
    try {
      const text = await GeminiService.extractText(file.localUrl);
      dispatch({ type: 'UPDATE_FILE_OCR', fileId: file.id, text });
      setSelectedFile({ ...file, extractedText: text });
    } finally {
      setIsExtracting(false);
    }
  };

  // Detail view
  if (selectedFile) {
    return (
      <div className="pb-4 fade-in">
        <button
          className="flex items-center gap-1 mb-4 text-sm font-medium"
          style={{ color: 'var(--color-primary)' }}
          onClick={() => setSelectedFile(null)}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Files
        </button>

        <div className="card p-4 mb-4">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            {selectedFile.fileName}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {format(new Date(selectedFile.createdAt), 'MMM d, yyyy h:mm a')} · {selectedFile.fileType.toUpperCase()}
          </p>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden mb-4 border" style={{ borderColor: 'var(--color-border)' }}>
            {selectedFile.fileType === 'image' ? (
              <img src={selectedFile.localUrl} alt={selectedFile.fileName}
                className="w-full max-h-96 object-contain" style={{ background: 'var(--color-surface-alt)' }} />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center" style={{ background: 'var(--color-surface-alt)' }}>
                <FileText className="w-16 h-16 text-red-500 mb-2" />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>PDF Document</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{selectedFile.fileName}</p>
              </div>
            )}
          </div>

          {/* OCR Section */}
          <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-alt)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Extracted Text / OCR
              </h3>
              {!selectedFile.extractedText && (
                <button
                  className="ios-btn ios-btn-primary text-sm py-2 px-3"
                  onClick={() => handleExtractText(selectedFile)}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" /> Extract
                    </>
                  )}
                </button>
              )}
            </div>
            {selectedFile.extractedText ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedFile.extractedText}
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>
                Click "Extract" to use AI/OCR to read text from this document.
                (Powered by Gemini API — placeholder for now)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4 fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Files & Bills</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Store and manage your documents
        </p>
      </div>

      {/* Upload Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          className="card p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Upload className="w-6 h-6 text-indigo-500" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Upload File</span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>PDF or Image</span>
        </button>

        <button
          className="card p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          onClick={() => cameraInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Camera className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Take Photo</span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Camera capture</span>
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFileUpload} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />

      {/* File List */}
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        Your Files ({state.files.length})
      </h2>

      {state.files.length === 0 ? (
        <div className="card p-8 text-center">
          <File className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No files yet</p>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Upload a PDF or take a photo to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {state.files.map(file => (
            <button
              key={file.id}
              className="card p-3 w-full flex items-center gap-3 text-left transition-all active:scale-[0.98]"
              onClick={() => setSelectedFile(file)}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-surface-alt)' }}>
                {file.fileType === 'pdf' ? (
                  <FileText className="w-6 h-6 text-red-500" />
                ) : file.localUrl.startsWith('data:image') ? (
                  <img src={file.localUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: file.fileType === 'pdf' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: file.fileType === 'pdf' ? '#ef4444' : '#3b82f6' }}>
                    {file.fileType.toUpperCase()}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Clock className="w-3 h-3" />
                    {format(new Date(file.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
              {file.extractedText && (
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
