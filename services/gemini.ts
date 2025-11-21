import { GoogleGenAI, Tool } from "@google/genai";
import { GroundingSource, FoodRecommendation, Recipe, AppMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractSources = (groundingChunks: any[]): GroundingSource[] => {
  return groundingChunks
    .map(chunk => {
      if (chunk.web) {
        return { title: chunk.web.title || "Web Source", uri: chunk.web.uri || "#" };
      }
      return null;
    })
    .filter((s): s is GroundingSource => s !== null);
};

const getModelConfig = (mode: AppMode) => {
  let model = "gemini-2.5-flash";
  let config: any = {
    tools: [{ googleSearch: {} }]
  };

  if (mode === 'fast') {
    model = "gemini-2.5-flash-lite";
  } else if (mode === 'thinking') {
    model = "gemini-3-pro-preview";
    config.thinkingConfig = { thinkingBudget: 32768 };
    // maxOutputTokens is intentionally omitted for thinking mode
  }

  return { model, config };
};

export const getFoodRecommendations = async (query: string, mode: AppMode = 'normal'): Promise<{ recommendations: FoodRecommendation[], rawText: string, allSources: GroundingSource[] }> => {
  
  const { model, config } = getModelConfig(mode);

  const prompt = `
    You are Google Foods, a helpful food recommendation assistant. 
    The user is asking: "${query}".
    
    Please suggest exactly 3 distinct food dishes or meals that match this request.
    For each recommendation, verify it exists using Google Search and find a relevant recipe or restaurant context.

    Format your response strictly using the following marker for each item so I can parse it:
    
    ### ITEM_START
    Name: [Dish Name]
    Description: [A mouth-watering description, followed by a brief reason why it fits the query]
    ### ITEM_END

    Do not use markdown lists or bullets inside the Name field. Keep descriptions concise (under 50 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    const text = response.text || "";
    
    // Extract Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const allSources = extractSources(groundingChunks);

    // Parse the text into recommendations
    const recommendations: FoodRecommendation[] = [];
    const parts = text.split("### ITEM_START");

    parts.forEach((part, index) => {
      if (!part.includes("### ITEM_END")) return;

      const content = part.split("### ITEM_END")[0].trim();
      const nameMatch = content.match(/Name:\s*(.+)/);
      const descMatch = content.match(/Description:\s*(.+)/s);

      if (nameMatch && descMatch) {
        recommendations.push({
          id: `rec-${index}`,
          title: nameMatch[1].trim(),
          description: descMatch[1].trim(),
          sources: [] 
        });
      }
    });

    return {
      recommendations,
      rawText: text,
      allSources
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const getDishRecipe = async (dishName: string, mode: AppMode = 'normal'): Promise<Recipe> => {
  // We map 'video' mode to 'normal' for recipe retrieval if it happens to be called
  const effectiveMode = mode === 'video' ? 'normal' : mode;
  const { model, config } = getModelConfig(effectiveMode);

  const prompt = `
    Find a detailed, highly-rated recipe for "${dishName}". 
    Use Google Search to find accurate ingredients and instructions.
    
    Format your response strictly as follows:
    
    PREP_TIME: [e.g. 30 mins]
    SERVINGS: [e.g. 4 people]
    
    INGREDIENTS_START
    - [Ingredient 1]
    - [Ingredient 2]
    ...
    INGREDIENTS_END
    
    INSTRUCTIONS_START
    1. [Step 1]
    2. [Step 2]
    ...
    INSTRUCTIONS_END
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = extractSources(groundingChunks);

    // Parsing logic
    const prepTime = text.match(/PREP_TIME:\s*(.+)/)?.[1] || "Varies";
    const servings = text.match(/SERVINGS:\s*(.+)/)?.[1] || "Varies";
    
    const ingredientsBlock = text.split("INGREDIENTS_START")[1]?.split("INGREDIENTS_END")[0] || "";
    const ingredients = ingredientsBlock
      .split("\n")
      .map(line => line.trim().replace(/^-\s*/, "").replace(/^\*\s*/, ""))
      .filter(line => line.length > 0);

    const instructionsBlock = text.split("INSTRUCTIONS_START")[1]?.split("INSTRUCTIONS_END")[0] || "";
    const instructions = instructionsBlock
      .split("\n")
      .map(line => line.trim().replace(/^\d+\.\s*/, "")) // Remove existing numbering if present, we'll add it in UI
      .filter(line => line.length > 0);

    return {
      dishName,
      prepTime: prepTime.trim(),
      servings: servings.trim(),
      ingredients,
      instructions,
      sources
    };

  } catch (error) {
    console.error("Gemini API Error (Recipe):", error);
    throw error;
  }
};

export const generateFoodVideo = async (prompt: string): Promise<string> => {
  // Check for API key selection as per Veo requirement
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }

  // Create a fresh instance to ensure we have the selected key
  const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let operation = await videoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic, high-quality food commercial shot of: ${prompt}. Appetizing, 4k, professional lighting.`,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await videoAi.operations.getVideosOperation({operation: operation});
    }

    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      throw new Error("No video URI returned from Veo.");
    }

    // Append API key for playback
    return `${uri}&key=${process.env.API_KEY}`;

  } catch (error) {
    console.error("Gemini Veo API Error:", error);
    throw error;
  }
};