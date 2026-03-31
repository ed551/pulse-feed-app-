import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: GenerateContentParameters): Promise<GenerateContentResponse> {
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (error?.status === 429 && retries < MAX_RETRIES - 1) {
        retries++;
        const backoffDelay = INITIAL_DELAY * Math.pow(2, retries);
        console.warn(`Rate limit hit. Retrying in ${backoffDelay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
        await delay(backoffDelay);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
