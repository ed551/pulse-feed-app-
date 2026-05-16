import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 10;
const INITIAL_DELAY = 1000; // 1 second

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 1500; // Slightly reduced while maintaining stability

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: any): Promise<GenerateContentResponse> {
  // 1. Detect Environment & Proxy if needed
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server proxy failed with status ${response.status}`);
      }
      return await response.json();
    } catch (proxyError: any) {
      console.warn("[AI Proxy] Attempt failed, falling back to local simulation if appropriate...", proxyError);
      throw proxyError;
    }
  }

  // 2. Server-side implementation (existing logic)
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  // Queue requests to ensure MIN_REQUEST_INTERVAL between them
  const currentQueue = requestQueue;
  let releaseQueue: () => void;
  requestQueue = new Promise(resolve => { releaseQueue = resolve; });
  
  await currentQueue;
  
  try {
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        const response = await ai.models.generateContent(params);
        // Add delay after successful request before releasing the queue
        await delay(MIN_REQUEST_INTERVAL);
        return response;
      } catch (error: any) {
        const status = error?.status || 
                       (error?.message?.includes("404") || error?.message?.includes("NOT_FOUND") ? 404 : 
                        error?.message?.includes("429") || error?.message?.includes("QUOTA") ? 429 : 500);
        
        const isQuotaExceeded = status === 429 || error?.message?.toLowerCase().includes("quota") || error?.message?.toLowerCase().includes("resource_exhausted");
        const isProxyError = status === 500 || status === 503 || status === 504 || error?.message?.toLowerCase().includes("xhr error") || error?.message?.toLowerCase().includes("failed to fetch");
        const isNotFound = status === 404;
        
        // Model Fallback Logic:
        if ((isQuotaExceeded || isProxyError || isNotFound)) {
          const oldModel = params.model;
          if (params.model === 'gemini-3-flash-preview' || params.model === 'gemini-3-flash') {
            params.model = 'gemini-flash-latest';
            console.warn(`AI model ${oldModel} failed (${status}). Falling back to ${params.model} as per instructions.`);
            continue;
          }
          if (params.model === 'gemini-flash-latest' || params.model === 'gemini-1.5-flash-latest' || params.model === 'gemini-2.0-flash-exp') {
            params.model = 'gemini-1.5-flash';
            console.warn(`AI model ${oldModel} failed (${status}). Falling back to stable ${params.model}`);
            // Disable tools as a last resort for broad compatibility
            if (params.tools) {
               delete params.tools;
               delete params.toolConfig;
            }
            continue;
          }
          if (params.model === 'gemini-1.5-flash') {
            params.model = 'gemini-1.5-pro';
            console.warn(`AI model ${oldModel} failed (${status}). Falling back to pro ${params.model}`);
            continue;
          }
        }


        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          // Exponential backoff with jitter and increased delay for higher retries
          const backoffDelay = (INITIAL_DELAY * Math.pow(1.5, retries)) + (Math.random() * 2000); 
          console.warn(`AI service under load (Status: ${status}). Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          await delay(backoffDelay);
          continue;
        }
        
        if (isQuotaExceeded) {
          const cleanError = new Error(`The AI service is currently at peak capacity. We are retrying with increased delays to ensure your request completes. (System load: ${retries}/${MAX_RETRIES})`);
          (cleanError as any).status = 429;
          (cleanError as any).originalError = error;
          throw cleanError;
        }
        
        throw error;
      }
    }
    throw new Error("AI service unavailable after multiple retries across different models.");
  } finally {
    releaseQueue!();
  }
}
