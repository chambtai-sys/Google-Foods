import React, { useState, KeyboardEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative group">
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
          placeholder="What are you craving? (e.g. Spicy Ramen, Healthy Lunch)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button 
          onClick={() => query.trim() && onSearch(query)}
          className="pr-4 md:pr-6 text-blue-500 font-medium hover:text-blue-600 transition-colors disabled:opacity-50"
          disabled={!query.trim() || isLoading}
        >
          Search
        </button>
      </div>
    </div>
  );
};
