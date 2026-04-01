import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MAX_RETRIES = 2;
const INITIAL_DELAY = 2000; // 2 seconds

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between any AI requests in the same tab

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
  if (params.model?.startsWith('gemini-3') && !params.config?.thinkingConfig) {
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
        const isQuotaExceeded = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
        const isProxyError = error?.message?.includes("Rpc failed due to xhr error") || error?.status === 500;
        
        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          const backoffDelay = INITIAL_DELAY * Math.pow(3, retries); // More aggressive backoff
          console.warn(`AI Quota/Proxy limit hit. Retrying in ${backoffDelay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          await delay(backoffDelay);
          continue;
        }
        
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
  } finally {
    releaseQueue!();
  }
}
