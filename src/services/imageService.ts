import { generateContentWithRetry } from "../lib/ai";

export const generateAvatar = async (prompt: string): Promise<string> => {
  try {
    const response = await generateContentWithRetry({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};
