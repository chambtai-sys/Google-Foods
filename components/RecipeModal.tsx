
import React, { useEffect, useState, useRef } from 'react';
import { FoodRecommendation, Recipe, AppMode } from '../types';
import { getDishRecipe } from '../services/gemini';
import { X, Clock, Users, ChefHat, Loader2, MonitorPlay, ChevronLeft, ChevronRight, CheckCircle2, Maximize2, Minimize2, Share2, Check } from 'lucide-react';
import { SourceList } from './SourceList';

interface RecipeModalProps {
  item: FoodRecommendation | null;
  onClose: () => void;
  mode: AppMode;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ item, onClose, mode }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justShared, setJustShared] = useState(false);
  
  // Cook Mode State
  const [isCookMode, setIsCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (item) {
      setLoading(true);
      setError(null);
      setRecipe(null);
      getDishRecipe(item.title, mode)
        .then(data => {
          setRecipe(data);
          setLoading(false);
        })
        .catch(() => {
          setError("Could not load recipe. Please try again.");
          setLoading(false);
        });
    }
  }, [item, mode]);

  // Handle Wake Lock for Cook Mode
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isCookMode) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.warn('Wake Lock release failed:', err);
        }
      }
    };

    if (isCookMode) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire lock if visibility changes (e.g. user tabs away and back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isCookMode) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCookMode]);

  const toggleCookMode = () => {
    setIsCookMode(!isCookMode);
    // Reset to step 0 if entering, or keep context? Let's keep context if they toggle back and forth
  };

  const nextStep = () => {
    if (recipe && currentStep < recipe.instructions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    
    const shareData = {
      title: `Recipe: ${item.title}`,
      text: `Check out this delicious dish I found on Google Foods: ${item.title}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(item.title + " recipe")}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setJustShared(true);
        setTimeout(() => setJustShared(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (!item) return null;

  // Cook Mode UI
  if (isCookMode && recipe) {
    return (
      <div className="fixed inset-0 z-[60] bg-gray-900 text-white flex flex-col animate-in fade-in duration-300">
        {/* Cook Mode Header */}
        <div className="p-4 md:p-6 flex items-center justify-between bg-gray-800 shadow-md">
          <div>
            <h2 className="text-lg font-medium text-gray-300 uppercase tracking-wider">Cook Mode</h2>
            <p className="text-xl md:text-2xl font-google font-bold truncate max-w-md">{recipe.dishName}</p>
          </div>
          <button 
            onClick={toggleCookMode}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
            <span className="hidden md:inline">Exit Cook Mode</span>
          </button>
        </div>

        {/* Active Step Content */}
        <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-5xl mx-auto w-full">
          <span className="inline-block px-4 py-1 rounded-full bg-blue-600/20 text-blue-300 font-medium mb-6 border border-blue-500/30">
            Step {currentStep + 1} of {recipe.instructions.length}
          </span>
          
          <p className="text-2xl md:text-4xl md:leading-tight font-medium leading-relaxed animate-in slide-in-from-right-8 duration-300 key={currentStep}">
            {recipe.instructions[currentStep]}
          </p>

          {/* Ingredients hint for this step could go here if we had structured data, 
              for now we just show the instruction */}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-800">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / recipe.instructions.length) * 100}%` }}
          />
        </div>

        {/* Navigation Controls */}
        <div className="p-6 md:p-8 bg-gray-800 flex items-center justify-between gap-4">
          <button 
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-700 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-all active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
            Previous
          </button>
          
          <div className="hidden md:flex flex-col items-center text-gray-400 text-sm">
            <MonitorPlay className="w-5 h-5 mb-1 text-green-400" />
            <span>Screen Awake</span>
          </div>

          <button 
            onClick={nextStep}
            disabled={currentStep === recipe.instructions.length - 1}
            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50 disabled:bg-gray-700 disabled:cursor-not-allowed hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            {currentStep === recipe.instructions.length - 1 ? (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Finish
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Standard Modal UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-google font-bold text-gray-800">{item.title}</h2>
            <p className="text-gray-500 text-sm mt-1">Detailed preparation guide</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors text-gray-500 shadow-sm border border-gray-200 flex items-center justify-center"
              title="Share Recipe"
            >
              {justShared ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors text-gray-500 shadow-sm border border-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p>Finding the best information for you...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center">
              {error}
              <button 
                onClick={() => item && getDishRecipe(item.title, mode).then(setRecipe)}
                className="block mx-auto mt-2 text-sm font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && recipe && (
            <div className="space-y-8">
              {/* Meta Info */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.prepTime}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Ingredients */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-yellow-400 rounded-full"></span>
                    Ingredients / Items
                  </h3>
                  <ul className="space-y-3">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 shrink-0" />
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-red-400 rounded-full"></span>
                      Instructions / Details
                    </h3>
                    <button 
                      onClick={toggleCookMode}
                      className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Cook Mode
                    </button>
                  </div>
                  
                  <ol className="space-y-4">
                    {recipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-4 text-gray-700 group">
                        <span className="flex-shrink-0 w-6 h-6 bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-gray-500 font-bold text-xs rounded-full flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Attribution */}
              {recipe.sources.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                   <SourceList sources={recipe.sources} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};