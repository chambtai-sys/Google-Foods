
import { GoogleGenAI, Tool } from "@google/genai";
import { GroundingSource, FoodRecommendation, Recipe, AppMode, Attachment } from "../types";

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

export const getFoodRecommendations = async (
  query: string, 
  mode: AppMode = 'normal',
  attachment?: Attachment
): Promise<{ recommendations: FoodRecommendation[], rawText: string, allSources: GroundingSource[] }> => {
  
  const { model, config } = getModelConfig(mode);

  let systemInstruction = `
    You are Google Foods, a helpful food recommendation assistant.
    Format your response strictly using the following marker for each item so I can parse it:
    
    ### ITEM_START
    Name: [Dish Name or Analysis Topic]
    Description: [Description or Analysis Result]
    ### ITEM_END

    Do not use markdown lists or bullets inside the Name field. Keep descriptions concise (under 50 words).
  `;

  // Adjust prompt based on attachment type
  let promptText = `The user is asking: "${query}". Please suggest exactly 3 distinct food dishes or meals that match this request.`;
  
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
    // No attachment, standard text query
    promptText += ` Verify recommendations exist using Google Search.`;
  }

  // Add the text prompt part
  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model,
      contents, // Pass array of parts
      config: {
        ...config,
        systemInstruction
      }
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
  // We map 'video' and 'image' mode to 'normal' for recipe retrieval if it happens to be called
  const effectiveMode = (mode === 'video' || mode === 'image') ? 'normal' : mode;
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
