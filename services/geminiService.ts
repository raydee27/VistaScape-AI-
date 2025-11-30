import { GoogleGenAI } from "@google/genai";
import { ImageData, ChatMessage, VideoData } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates an image transformation or edit based on an original image and a prompt.
 * Uses Gemini 2.5 Flash Image for fast editing.
 */
export const generateImageEdit = async (
  originalImage: ImageData, 
  userPrompt: string
): Promise<ImageData> => {
  const ai = getClient();
  const base64Data = originalImage.base64.split(',')[1] || originalImage.base64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `${userPrompt} \n\n(Generate a high-quality result preserving the core content of the image while applying the requested changes.)`
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: originalImage.mimeType,
            },
          },
        ],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData) {
            return {
              base64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType,
            };
          }
        }
      }
    }

    throw new Error("No image was generated. Please try again with a more specific description.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Rapidly identifies key elements in the image using Gemini Flash.
 */
export const identifyFeatures = async (
  originalImage: ImageData
): Promise<string[]> => {
  const ai = getClient();
  const base64Data = originalImage.base64.split(',')[1] || originalImage.base64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: "Analyze this image and identify 5-7 key physical elements present (e.g., 'Oak Tree', 'Paved Patio', 'Wooden Fence', 'Swimming Pool', 'Overgrown Lawn', 'Modern House'). Return the response as a simple comma-separated list."
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: originalImage.mimeType,
            },
          },
        ],
      },
    });

    const text = response.text || "";
    return text.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 40)
      .slice(0, 10);
  } catch (error) {
    console.error("Gemini Identify Error:", error);
    return [];
  }
};

/**
 * Analyzes the uploaded image to provide design suggestions.
 */
export const analyzeImage = async (
  originalImage: ImageData
): Promise<string> => {
  const ai = getClient();
  const base64Data = originalImage.base64.split(',')[1] || originalImage.base64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            text: `Analyze this image. 
            Identify the key features.
            Then, suggest 3-4 specific, creative visual improvements or edits (like filters, object removals, or landscaping changes).
            Write the response as a cohesive, inspiring vision statement that I can use as a prompt for generation. 
            Keep it under 150 words.`
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: originalImage.mimeType,
            },
          },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image.");
  }
};

/**
 * Analyzes a video using Gemini Pro to extract key information.
 */
export const analyzeVideo = async (
  video: ImageData,
  prompt: string
): Promise<string> => {
  const ai = getClient();
  const base64Data = video.base64.split(',')[1] || video.base64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            text: prompt || "Analyze this video in detail. Describe the scene, key objects, actions, and any notable visual characteristics."
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: video.mimeType,
            },
          },
        ],
      },
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini Video Analysis Error:", error);
    throw new Error("Failed to analyze video. Note: Large video files may exceed inline transfer limits.");
  }
};

/**
 * Generates a video from an image and prompt using Veo 3.1.
 */
export const generateVideo = async (
  originalImage: ImageData,
  prompt: string
): Promise<VideoData> => {
  const ai = getClient();
  const base64Data = originalImage.base64.split(',')[1] || originalImage.base64;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64Data,
        mimeType: originalImage.mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' // Default to landscape
      }
    });

    // Poll until done
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("Video generation completed but no URI was returned.");
    }

    // Append API key to fetch the content securely
    const videoUrlWithKey = `${videoUri}&key=${process.env.API_KEY}`;
    
    // Fetch the video blob to ensure it's playable
    const videoResponse = await fetch(videoUrlWithKey);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const blob = await videoResponse.blob();
    const objectUrl = URL.createObjectURL(blob);

    return {
      videoUrl: objectUrl,
      mimeType: 'video/mp4'
    };

  } catch (error) {
    console.error("Veo Generation Error:", error);
    throw error;
  }
};

/**
 * Sends a chat message to Gemini and receives a response.
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  image?: ImageData
): Promise<string> => {
  const ai = getClient();
  
  try {
    // Only include valid parts in history
    const sdkHistory = history.map(msg => {
      const parts: any[] = [];
      if (msg.text && msg.text.trim() !== "") {
        parts.push({ text: msg.text });
      }
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.base64.split(',')[1] || msg.image.base64
          }
        });
      }
      // Fallback for empty messages in history to prevent API errors
      if (parts.length === 0) {
        parts.push({ text: "..." });
      }
      return { role: msg.role, parts };
    });

    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: sdkHistory,
      config: {
        systemInstruction: "You are a helpful landscaping and design assistant for VistaScape AI. Your goal is to help users visualize property transformations. \n\nCAPABILITIES:\n1. Analyze uploaded images: Identify plants, styles, hardscaping features, and potential improvements.\n2. Provide design advice: Suggest plants for specific climates, color palettes, and layout ideas.\n3. Answer questions: Help with app usage or general landscaping queries.\n\nTONE: Professional, encouraging, and concise.",
      }
    });

    let messageContent: any[] = [];
    if (newMessage && newMessage.trim() !== "") {
      messageContent.push({ text: newMessage });
    }
    if (image) {
      messageContent.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64.split(',')[1] || image.base64
        }
      });
    }

    if (messageContent.length === 0) {
       messageContent.push({ text: "Analyze this image" });
    }

    const result = await chat.sendMessage({ message: messageContent });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw new Error("Failed to send message.");
  }
};