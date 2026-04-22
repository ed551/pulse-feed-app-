import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 3;
const INITIAL_DELAY = 3000; // 3 seconds

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between any AI requests in the same tab

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
  
  // Enable High Thinking for Gemini 3 series models if not specified
  // EXCEPTION: Do not enable for TTS models as they don't support thinking
  if (params.model?.startsWith('gemini-3') && !params.model.includes('tts') && !params.config?.thinkingConfig) {
    params.config = {
      ...params.config,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    };
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
        const isProxyError = error?.message?.includes("Rpc failed due to xhr error") || error?.status === 500 || error?.status === 503;
        
        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          // Exponential backoff with jitter
          const backoffDelay = (INITIAL_DELAY * Math.pow(2, retries)) + (Math.random() * 1000); 
          console.warn(`AI service busy. Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          await delay(backoffDelay);
          continue;
        }
        
        if (isQuotaExceeded) {
          const cleanError = new Error("The AI service is currently experiencing high volume. We'll try again automatically in a moment.");
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
