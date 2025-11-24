
import React, { useState } from 'react';
import { GoogleFoodsLogo } from './components/GoogleFoodsLogo';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { SourceList } from './components/SourceList';
import { RecipeModal } from './components/RecipeModal';
import { getFoodRecommendations, generateFoodVideo, generateFoodImage } from './services/gemini';
import { SearchState, FoodRecommendation, AppMode, Attachment } from './types';
import { ChefHat, Sparkles, Bolt, Info, BrainCircuit, Video, Image as ImageIcon, Download, Github, Globe, MapPin, Store } from 'lucide-react';

const SUGGESTED_TAGS = [
  "Healthy Lunch", "Spicy Dinner", "Italian", "Vegan", "Comfort Food", "Sushi", "Late Night Snack"
];

export default function App() {
  const [state, setState] = useState<SearchState>({
    isLoading: false,
    results: [],
    error: null,
    allSources: [],
    videoUrl: undefined,
    imageUrl: undefined
  });
  
  const [selectedDish, setSelectedDish] = useState<FoodRecommendation | null>(null);
  const [mode, setMode] = useState<AppMode>('normal');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const handleSearch = async (query: string, attachment?: Attachment) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      results: [], 
      allSources: [], 
      videoUrl: undefined, 
      imageUrl: undefined 
    }));
    
    // Video Generation Mode (Text only supported currently in this implementation)
    if (mode === 'video') {
      if (attachment) {
        setState({
          isLoading: false,
          results: [],
          error: "Video generation from files is not supported yet. Please use text mode or remove the file.",
          allSources: []
        });
        return;
      }
      try {
        const videoUrl = await generateFoodVideo(query);
        setState({
          isLoading: false,
          results: [],
          error: null,
          videoUrl
        });
      } catch (err) {
        setState({
          isLoading: false,
          results: [],
          error: "Could not generate video. Please try again later.",
          allSources: []
        });
      }
      return;
    }

    // Image Generation Mode (Text only supported currently)
    if (mode === 'image') {
      if (attachment) {
        setState({
          isLoading: false,
          results: [],
          error: "Image generation from files is not supported yet. Please use text mode or remove the file.",
          allSources: []
        });
        return;
      }
      try {
        const imageUrl = await generateFoodImage(query, imageSize);
        setState({
          isLoading: false,
          results: [],
          error: null,
          imageUrl
        });
      } catch (err) {
        setState({
          isLoading: false,
          results: [],
          error: "Could not generate image. Please try again later.",
          allSources: []
        });
      }
      return;
    }

    // Normal / Fast / Thinking / Agents modes (Support Multimodal)
    try {
      const data = await getFoodRecommendations(query, mode, attachment);
      setState({
        isLoading: false,
        results: data.recommendations,
        rawText: data.rawText,
        allSources: data.allSources,
        error: null
      });
    } catch (err) {
      console.error(err);
      setState({
        isLoading: false,
        results: [],
        error: "Oops! We couldn't find that right now. Please check your connection or API key.",
        allSources: []
      });
    }
  };

  const handleViewRecipe = (item: FoodRecommendation) => {
    setSelectedDish(item);
  };

  // Fallback view if parsing fails but we have text (rare edge case with Gemini)
  const showRawText = state.results.length === 0 && state.rawText && !state.isLoading && !state.videoUrl && !state.imageUrl;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      
      <header className="w-full p-4 md:p-6 flex justify-end">
         <a 
           href="https://github.com/chambtai-sys/Google-Foods"
           target="_blank"
           rel="noopener noreferrer"
           className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors font-medium text-sm"
         >
           <Github className="w-5 h-5" />
           <span>GitHub</span>
         </a>
      </header>

      <main className="flex-grow flex flex-col items-center px-4 pb-12 w-full max-w-6xl mx-auto">
        
        {/* Hero / Search Area */}
        <div className={`transition-all duration-500 ease-in-out w-full flex flex-col items-center ${state.results.length > 0 || state.isLoading || state.videoUrl || state.imageUrl ? 'mt-4 mb-8' : 'mt-[10vh] mb-12'}`}>
          <GoogleFoodsLogo large={state.results.length === 0 && !state.isLoading && !state.videoUrl && !state.imageUrl} className="mb-6 md:mb-8" />
          
          <h1 className="text-lg md:text-xl text-gray-600 mb-4 font-google font-normal text-center">
            Hungry? Here is some reccomended foods you may like
          </h1>

          {/* Mode Selectors */}
          <div className="mb-3 flex flex-wrap justify-center items-center gap-3">
             {/* Fast Mode Button */}
             <button
                onClick={() => setMode(mode === 'fast' ? 'normal' : 'fast')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'fast'
                    ? 'bg-amber-400 text-white shadow-md ring-2 ring-amber-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                `}
              >
                <Bolt className={`w-4 h-4 ${mode === 'fast' ? 'fill-current' : ''}`} />
                Fast
                
                <div 
                  className="group relative ml-1 p-1 rounded-full hover:bg-black/5 transition-colors cursor-help"
                  onClick={(e) => e.stopPropagation()}
                  title="Info about Fast Mode"
                >
                  <Info className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 text-center font-normal leading-relaxed">
                    Uses <strong>Gemini Flash-Lite</strong> for lightning fast responses. Perfect for quick ideas!
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </button>

             {/* Thinking Mode Button */}
             <button
                onClick={() => setMode(mode === 'thinking' ? 'normal' : 'thinking')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'thinking'
                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                `}
              >
                <BrainCircuit className={`w-4 h-4 ${mode === 'thinking' ? 'fill-current' : ''}`} />
                Thinking
                
                <div 
                  className="group relative ml-1 p-1 rounded-full hover:bg-white/20 transition-colors cursor-help"
                  onClick={(e) => e.stopPropagation()}
                  title="Info about Thinking Mode"
                >
                  <Info className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 text-center font-normal leading-relaxed">
                    Uses <strong>Gemini Pro</strong> with deep reasoning to plan complex meals and verify details thoroughly.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </button>

             {/* Video Mode Button */}
             <button
                onClick={() => setMode(mode === 'video' ? 'normal' : 'video')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'video'
                    ? 'bg-pink-500 text-white shadow-md ring-2 ring-pink-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                `}
              >
                <Video className={`w-4 h-4 ${mode === 'video' ? 'fill-current' : ''}`} />
                Video
                
                <div 
                  className="group relative ml-1 p-1 rounded-full hover:bg-white/20 transition-colors cursor-help"
                  onClick={(e) => e.stopPropagation()}
                  title="Info about Video Mode"
                >
                  <Info className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 text-center font-normal leading-relaxed">
                    Uses <strong>Veo</strong> to generate delicious food videos from your prompts.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </button>

              {/* Image Mode Button */}
              <button
                onClick={() => setMode(mode === 'image' ? 'normal' : 'image')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'image'
                    ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                `}
              >
                <ImageIcon className={`w-4 h-4 ${mode === 'image' ? 'fill-current' : ''}`} />
                Image
                
                <div 
                  className="group relative ml-1 p-1 rounded-full hover:bg-white/20 transition-colors cursor-help"
                  onClick={(e) => e.stopPropagation()}
                  title="Info about Image Mode"
                >
                  <Info className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 text-center font-normal leading-relaxed">
                    Uses <strong>Gemini 3 Pro Image</strong> to generate high-fidelity food photography.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </button>
          </div>

          {/* Agents Buttons */}
          <div className="mb-4 flex flex-wrap justify-center items-center gap-3">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Agents:</div>
             
             {/* Google Search Agent */}
             <button
                onClick={() => setMode(mode === 'search_agent' ? 'normal' : 'search_agent')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'search_agent'
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'
                  }
                `}
              >
                <Globe className="w-4 h-4" />
                Search Agent
             </button>

             {/* Restaurant Finder Agent */}
             <button
                onClick={() => setMode(mode === 'restaurants' ? 'normal' : 'restaurants')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                  ${mode === 'restaurants'
                    ? 'bg-red-500 text-white shadow-md ring-2 ring-red-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                  }
                `}
              >
                <Store className="w-4 h-4" />
                Restaurant Finder
             </button>
          </div>

          {/* Image Size Selector (Only visible in Image Mode) */}
          {mode === 'image' && (
            <div className="mb-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 bg-emerald-50 p-1.5 rounded-full border border-emerald-100">
               <span className="text-xs font-bold text-emerald-800 px-2">Size:</span>
               {(['1K', '2K', '4K'] as const).map(size => (
                 <button
                   key={size}
                   onClick={() => setImageSize(size)}
                   className={`
                     px-3 py-1 text-xs rounded-full font-medium transition-colors
                     ${imageSize === size 
                       ? 'bg-emerald-500 text-white shadow-sm' 
                       : 'text-emerald-700 hover:bg-emerald-100'
                     }
                   `}
                 >
                   {size}
                 </button>
               ))}
            </div>
          )}

          <SearchBar 
            onSearch={handleSearch} 
            isLoading={state.isLoading} 
          />
          
          {!state.results.length && !state.isLoading && !state.videoUrl && !state.imageUrl && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl animate-fade-in">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {state.isLoading && (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse">
             {mode === 'thinking' ? (
               <BrainCircuit className="w-12 h-12 text-purple-500 mb-4 animate-pulse" />
             ) : mode === 'video' ? (
               <Video className="w-12 h-12 text-pink-500 mb-4 animate-pulse" />
             ) : mode === 'image' ? (
               <ImageIcon className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
             ) : mode === 'restaurants' ? (
               <MapPin className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
             ) : mode === 'search_agent' ? (
               <Globe className="w-12 h-12 text-blue-500 mb-4 animate-spin-slow" />
             ) : (
               <ChefHat className="w-12 h-12 text-gray-300 mb-4" />
             )}
             <p className="text-gray-500 font-medium">
                {mode === 'fast' && "Speedy Chef is searching..."}
                {mode === 'thinking' && "Chef Gemini is deeply analyzing the best culinary matches..."}
                {mode === 'video' && "Generating your delicious video (this may take a moment)..."}
                {mode === 'image' && `Generating your ${imageSize} food masterpiece...`}
                {mode === 'restaurants' && "Locating the best restaurants near you..."}
                {mode === 'search_agent' && "Searching the web for the best answers..."}
                {mode === 'normal' && "Chef Gemini is looking up the best options..."}
             </p>
             <div className="mt-2 text-xs text-gray-400">
               {mode === 'video' ? "Powered by Veo" 
                 : mode === 'image' ? "Powered by Gemini 3 Pro" 
                 : mode === 'restaurants' ? "Powered by Google Maps"
                 : "Powered by Google Search"}
             </div>
          </div>
        )}

        {/* Video Result */}
        {!state.isLoading && state.videoUrl && (
          <div className="w-full max-w-3xl animate-fade-in-up">
             <div className="bg-black rounded-2xl shadow-lg overflow-hidden aspect-video">
               <video 
                 src={state.videoUrl} 
                 controls 
                 autoPlay 
                 className="w-full h-full"
               />
             </div>
             <div className="mt-4 text-center">
                <a 
                   href={state.videoUrl} 
                   download="food-generation.mp4"
                   className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </a>
             </div>
          </div>
        )}

        {/* Image Result */}
        {!state.isLoading && state.imageUrl && (
          <div className="w-full max-w-2xl animate-fade-in-up">
             <div className="bg-gray-100 rounded-2xl shadow-lg overflow-hidden border border-gray-200">
               <img 
                 src={state.imageUrl} 
                 alt="Generated Food" 
                 className="w-full h-auto object-contain"
               />
             </div>
             <div className="mt-4 text-center">
                <a 
                   href={state.imageUrl} 
                   download={`food-${new Date().getTime()}.png`}
                   className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </a>
             </div>
          </div>
        )}

        {/* Results Grid */}
        {!state.isLoading && state.results.length > 0 && (
          <div className="w-full animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {state.results.map((item, idx) => (
                <ResultCard 
                  key={item.id} 
                  item={item} 
                  index={idx} 
                  onViewRecipe={handleViewRecipe}
                />
              ))}
            </div>
            
            {state.allSources && state.allSources.length > 0 && (
              <SourceList sources={state.allSources} />
            )}
          </div>
        )}

        {/* Fallback Raw Text View */}
        {showRawText && (
          <div className="w-full max-w-3xl bg-gray-50 p-6 rounded-xl border border-gray-200 whitespace-pre-wrap text-gray-700 leading-relaxed">
             <div className="flex items-center gap-2 mb-4 text-blue-600">
               <Sparkles className="w-5 h-5" />
               <span className="font-bold">Here's what we found:</span>
             </div>
             {state.rawText}
             {state.allSources && <SourceList sources={state.allSources} />}
          </div>
        )}

        {/* Error State */}
        {state.error && (
           <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg border border-red-100 mt-8">
             {state.error}
           </div>
        )}

      </main>

      <footer className="w-full py-6 text-center text-gray-400 text-sm border-t border-gray-100">
        <p>&copy; {new Date().getFullYear()} Google Foods Concept. Powered by Google Gemini.</p>
      </footer>

      {/* Recipe Modal */}
      {selectedDish && (
        <RecipeModal 
          item={selectedDish} 
          onClose={() => setSelectedDish(null)}
          mode={mode}
        />
      )}
      
    </div>
  );
}