
import { GoogleGenAI } from "@google/genai";
import { GroundingSource, FoodRecommendation, Recipe, AppMode, Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractSources = (groundingChunks: any[]): GroundingSource[] => {
  return groundingChunks
    .flatMap(chunk => {
      const sources: GroundingSource[] = [];
      
      // Handle Web Search Grounding
      if (chunk.web) {
        sources.push({ 
          title: chunk.web.title || "Web Source", 
          uri: chunk.web.uri || "#" 
        });
      }
      
      // Handle Google Maps Grounding
      if (chunk.maps) {
        if (chunk.maps.uri) {
           sources.push({
             title: chunk.maps.title || "Google Maps Location",
             uri: chunk.maps.uri
           });
        }
        // Maps often returns place details in other properties, but uri is the main link
      }
      
      return sources;
    })
    .filter((s): s is GroundingSource => s !== null && s.uri !== "#");
};

const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | undefined> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return undefined;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Geolocation access denied or failed:", error);
        resolve(undefined);
      },
      { timeout: 5000 }
    );
  });
};

const getModelConfig = async (mode: AppMode) => {
  let model = "gemini-2.5-flash";
  let config: any = {
    tools: [{ googleSearch: {} }] // Default to search
  };
  let toolConfig: any = undefined;

  if (mode === 'fast') {
    model = "gemini-2.5-flash-lite";
  } else if (mode === 'thinking') {
    model = "gemini-3-pro-preview";
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else if (mode === 'restaurants') {
    // Restaurant Agent uses Maps
    config.tools = [{ googleMaps: {} }];
    
    // Attempt to get location for better results
    const location = await getCurrentLocation();
    if (location) {
      toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      };
    }
  } else if (mode === 'search_agent') {
    // Explicit Search Agent uses Flash with Search (same as default but conceptually distinct)
    model = "gemini-2.5-flash";
    config.tools = [{ googleSearch: {} }];
  }

  return { model, config, toolConfig };
};

export const getFoodRecommendations = async (
  query: string, 
  mode: AppMode = 'normal',
  attachment?: Attachment
): Promise<{ recommendations: FoodRecommendation[], rawText: string, allSources: GroundingSource[] }> => {
  
  const { model, config, toolConfig } = await getModelConfig(mode);

  let systemInstruction = `
    You are Google Foods, a helpful food recommendation assistant.
    Format your response strictly using the following marker for each item so I can parse it:
    
    ### ITEM_START
    Name: [Dish Name or Restaurant Name or Topic]
    Description: [Description, Address/Rating (if restaurant), or Analysis Result]
    ### ITEM_END

    Do not use markdown lists or bullets inside the Name field. Keep descriptions concise (under 50 words).
  `;

  let promptText = "";
  
  // Custom prompts based on Mode/Agent
  if (mode === 'restaurants') {
    promptText = `The user is looking for restaurants matching: "${query}". 
    Find exactly 3 distinct, highly-rated restaurants nearby (or in the specified location).
    Include the rating and a brief summary of what they are known for in the description.`;
  } else if (mode === 'search_agent') {
    promptText = `Act as an expert Research Agent. The user is asking: "${query}". 
    Use Google Search to find exactly 3 interesting facts, trending dishes, or specific answers related to this.`;
  } else {
    // Standard recommendation prompt
    promptText = `The user is asking: "${query}". Please suggest exactly 3 distinct food dishes or meals that match this request.`;
  }

  const contents: any[] = [];

  if (attachment) {
    // Add the file to the request
    contents.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.base64Data
      }
    });

    if (attachment.mimeType.startsWith('image/')) {
      promptText = `
        Analyze the attached image. 
        If it shows a dish, identify it and suggest similar foods (Name: [Dish Name], Description: [Identification & why it looks good]).
        If it shows ingredients, suggest 3 recipes using them.
        User query: "${query}"
      `;
    } else if (attachment.mimeType.startsWith('text/') || attachment.mimeType === 'text/plain') {
      promptText = `
        Analyze the attached text content. 
        Summarize the food-related concepts, menu items, or recipes found within.
        User query: "${query}"
      `;
    } else if (attachment.mimeType.startsWith('audio/')) {
      promptText = `
        Listen to the attached audio. 
        If it is a podcast or conversation, improve the flow, summarize recipes mentioned, or identify the food topics discussed.
        Format the output as 3 key takeaways or recipes mentioned.
        User query: "${query}"
      `;
    } else if (attachment.mimeType.startsWith('video/')) {
      promptText = `
        Watch the attached video. 
        Analyze the cooking techniques, identify the dish being prepared, or summarize the food content.
        User query: "${query}"
      `;
    }
  } else {
    // No attachment
    if (mode === 'restaurants') {
      promptText += ` Verify restaurant details using Google Maps.`;
    } else {
      promptText += ` Verify recommendations exist using Google Search.`;
    }
  }

  // Add the text prompt part
  contents.push({ text: promptText });

  const finalConfig: any = { ...config, systemInstruction };
  if (toolConfig) {
    finalConfig.toolConfig = toolConfig;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: finalConfig
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
  // We map specialized modes to 'normal' for recipe retrieval to ensure we just use standard search for recipes
  const effectiveMode = (mode === 'video' || mode === 'image' || mode === 'restaurants' || mode === 'search_agent') ? 'normal' : mode;
  // Note: We await getModelConfig because it's async now, though for 'normal' mode it doesn't do async work usually.
  const { model, config } = await getModelConfig(effectiveMode);

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

export const generateFoodImage = async (prompt: string, size: '1K' | '2K' | '4K'): Promise<string> => {
  // Check for API key selection (mandatory for gemini-3-pro-image-preview)
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }

  const imageAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await imageAi.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `A professional, high-quality food photography shot of ${prompt}. Studio lighting, appetizing, delicious details.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        }
      }
    });

    // Iterate through parts to find the image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data returned from API.");

  } catch (error) {
    console.error("Gemini Image API Error:", error);
    throw error;
  }
};