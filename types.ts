
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface FoodRecommendation {
  id: string;
  title: string;
  description: string;
  sources: GroundingSource[];
}

export interface Recipe {
  dishName: string;
  prepTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
  sources: GroundingSource[];
}

export type AppMode = 'normal' | 'fast' | 'thinking' | 'video' | 'image';

export interface Attachment {
  file: File;
  previewUrl: string;
  mimeType: string;
  base64Data: string;
}

export interface SearchState {
  isLoading: boolean;
  results: FoodRecommendation[];
  error: string | null;
  rawText?: string;
  allSources?: GroundingSource[];
  videoUrl?: string;
  imageUrl?: string;
}
