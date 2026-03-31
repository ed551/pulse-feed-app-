import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 2;
const INITIAL_DELAY = 2000; // 2 seconds

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between any AI requests in the same tab

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: GenerateContentParameters): Promise<GenerateContentResponse> {
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  // Simple rate limiting in the same tab
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
  
  let retries = 0;
  
  while (retries <= MAX_RETRIES) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isQuotaExceeded = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
      
      if (isQuotaExceeded && retries < MAX_RETRIES) {
        retries++;
        const backoffDelay = INITIAL_DELAY * Math.pow(3, retries); // More aggressive backoff for quota issues
        console.warn(`AI Quota/Rate limit hit. Retrying in ${backoffDelay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
        await delay(backoffDelay);
        continue;
      }
      
      // If it's still a quota error after retries, throw a cleaner error
      if (isQuotaExceeded) {
        const cleanError = new Error("AI service is temporarily unavailable due to high demand. Please try again later.");
        (cleanError as any).status = 429;
        (cleanError as any).originalError = error;
        throw cleanError;
      }
      
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
