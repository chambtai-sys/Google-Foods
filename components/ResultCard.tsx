import React from 'react';
import { FoodRecommendation } from '../types';
import { ExternalLink, Utensils, BookOpen } from 'lucide-react';

interface ResultCardProps {
  item: FoodRecommendation;
  index: number;
  onViewRecipe: (item: FoodRecommendation) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, index, onViewRecipe }) => {
  // Deterministic generic food image placeholder based on index to vary visuals slightly
  const placeholderId = 100 + index; 
  const imageUrl = `https://picsum.photos/id/${placeholderId}/400/300`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
      <div className="h-48 overflow-hidden relative bg-gray-100 group">
         <img 
           src={imageUrl} 
           alt={item.title}
           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
           loading="lazy"
         />
         <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm">
            <Utensils className="w-4 h-4 text-gray-600" />
         </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-google font-bold text-gray-800 mb-2">
          {item.title}
        </h3>
        <p className="text-gray-600 leading-relaxed text-sm flex-grow mb-6">
          {item.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
           <button
             onClick={() => onViewRecipe(item)}
             className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2"
           >
             <BookOpen className="w-4 h-4" />
             View Recipe
           </button>
           {/* Optional: External generic search fallback */}
           <a 
             href={`https://www.google.com/search?q=${encodeURIComponent(item.title + " recipe")}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
             title="Search on Google"
           >
             <ExternalLink className="w-4 h-4" />
           </a>
        </div>
      </div>
    </div>
  );
};