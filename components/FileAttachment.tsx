
import React, { useRef } from 'react';
import { Paperclip, X, Image as ImageIcon, FileText, Video, Mic, FileAudio } from 'lucide-react';
import { Attachment } from '../types';

interface FileAttachmentProps {
  onFileSelect: (file: Attachment) => void;
  onRemove: () => void;
  currentFile?: Attachment;
  isLoading: boolean;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({ onFileSelect, onRemove, currentFile, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove the "data:*/*;base64," prefix for the API
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });

      const attachment: Attachment = {
        file,
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type,
        base64Data
      };

      onFileSelect(attachment);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file.");
    }
    
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getIcon = () => {
    if (!currentFile) return <Paperclip className="w-5 h-5" />;
    if (currentFile.mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (currentFile.mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (currentFile.mimeType.startsWith('audio/')) return <Mic className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.txt,text/plain"
        disabled={isLoading}
      />
      
      {currentFile ? (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-sm animate-in fade-in slide-in-from-bottom-2">
          {getIcon()}
          <span className="max-w-[100px] truncate font-medium">{currentFile.file.name}</span>
          <button 
            onClick={onRemove}
            className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-full transition-colors"
          title="Upload image, text, audio or video"
          disabled={isLoading}
        >
          <Paperclip className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
