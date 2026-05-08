import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000; // 1 second

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 2000; // 2000ms between AI requests to prevent rate limits as per AGENTS.md

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: GenerateContentParameters): Promise<GenerateContentResponse> {
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  // Queue requests to ensure MIN_REQUEST_INTERVAL between them
  const currentQueue = requestQueue;
  let releaseQueue: () => void;
  requestQueue = new Promise(resolve => { releaseQueue = resolve; });
  
  await currentQueue;
  
  // Only enable High Thinking if explicitly requested to save time
  if ((params.model?.startsWith('gemini-2.0') || params.model?.startsWith('gemini-3')) && !params.model.includes('tts') && params.config?.thinkingConfig === undefined) {
    // thinkingLevel is withheld for standard use to keep it fast
  }
  
  try {
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        const response = await ai.models.generateContent(params);
        // Add delay after successful request before releasing the queue
        await delay(MIN_REQUEST_INTERVAL);
        return response;
      } catch (error: any) {
        const isQuotaExceeded = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("429");
        const isProxyError = error?.status === 404 || error?.status === 500 || error?.status === 503 || error?.message?.includes("404") || error?.message?.includes("xhr error");
        
        // Model Fallback Logic: If a model fails with 404 or quota, try standard stable flash
        if ((isQuotaExceeded || isProxyError || error?.status === 404) && (params.model?.includes('2.0') || params.model?.includes('3.0'))) {
          console.warn(`Gemini series ${params.model} reported issues (404/Quota). Falling back to gemini-3-flash-preview for stability.`);
          params.model = 'gemini-3-flash-preview';
          // No retry increment for first model swap
          continue; 
        }

        // If fallback hits quota or 404, try last resort stable alias
        if ((isQuotaExceeded || error?.status === 404) && params.model === 'gemini-3-flash-preview') {
          console.warn("Gemini 3 Preview failed, trying gemini-flash-latest...");
          params.model = 'gemini-flash-latest'; 
          continue;
        }

        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          // Exponential backoff with jitter
          const backoffDelay = (INITIAL_DELAY * Math.pow(2, retries)) + (Math.random() * 1000); 
          console.warn(`AI service busy. Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          await delay(backoffDelay);
          continue;
        }
        
        if (isQuotaExceeded) {
          const cleanError = new Error(`The AI service is currently at peak capacity (Attempt ${retries}/${MAX_RETRIES}). We are retrying with increased delays to ensure your request completes.`);
          (cleanError as any).status = 429;
          (cleanError as any).originalError = error;
          throw cleanError;
        }
        
        throw error;
      }
    }
    throw new Error("AI service unavailable after multiple retries.");
  } finally {
    releaseQueue!();
  }
}
