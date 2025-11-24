
import React, { useState, KeyboardEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { FileAttachment } from './FileAttachment';
import { Attachment } from '../types';

interface SearchBarProps {
  onSearch: (query: string, attachment?: Attachment) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState("");
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (query.trim() || attachment)) {
      onSearch(query, attachment);
      // Optional: Clear attachment after search? 
      // Keeping it allows for refined queries on same file. Let's keep it for now.
    }
  };

  const handleSearchClick = () => {
    if (query.trim() || attachment) {
      onSearch(query, attachment);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      <div className={`
        relative flex items-center w-full h-12 md:h-14 rounded-full border 
        ${isLoading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-md bg-white'} 
        transition-all duration-300 shadow-sm
      `}>
        <div className="pl-4 md:pl-6 text-gray-400">
          {isLoading ? <Sparkles className="w-5 h-5 animate-spin text-blue-500" /> : <Search className="w-5 h-5" />}
        </div>
        
        <input
          type="text"
          className="flex-grow w-full h-full px-4 text-base md:text-lg bg-transparent outline-none text-gray-700 placeholder-gray-400 rounded-full"
          placeholder={attachment ? "Ask about this file..." : "What are you craving? (e.g. Spicy Ramen)"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        
        <div className="pr-2 flex items-center gap-1">
          <FileAttachment 
            onFileSelect={setAttachment}
            onRemove={() => setAttachment(undefined)}
            currentFile={attachment}
            isLoading={isLoading}
          />

          <button 
            onClick={handleSearchClick}
            className="px-4 text-blue-500 font-medium hover:text-blue-600 transition-colors disabled:opacity-50"
            disabled={(!query.trim() && !attachment) || isLoading}
          >
            Search
          </button>
        </div>
      </div>
      
      {attachment && attachment.mimeType.startsWith('image/') && (
        <div className="self-center animate-in fade-in zoom-in-95">
          <img 
            src={attachment.previewUrl} 
            alt="Preview" 
            className="h-24 rounded-lg shadow-sm border border-gray-200 object-cover" 
          />
        </div>
      )}
    </div>
  );
};
