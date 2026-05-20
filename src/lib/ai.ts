import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const getEnv = (name: string) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
  } catch (e) {}
  return undefined;
};

const apiKeyFromEnv = getEnv("GEMINI_AI") || getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_API_KEY") || getEnv("GEMINI_API");
const isValidApiKey = !!(apiKeyFromEnv && 
                      apiKeyFromEnv !== "MY_GEMINI_API_KEY" && 
                      apiKeyFromEnv.length > 5);

export const ai = isValidApiKey ? new GoogleGenAI({ 
  apiKey: apiKeyFromEnv,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
}) : null;

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
    let proxyRetries = 0;
    const MAX_PROXY_RETRIES = 5; // Increased for slower boots

    while (proxyRetries <= MAX_PROXY_RETRIES) {
      try {
        const targetUrl = `${window.location.origin}/api/gemini/generate`;
        if (proxyRetries === 0) {
          console.log(`[AI Proxy] Starting request to: ${targetUrl}`);
        }
        
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Client-Retry": proxyRetries.toString()
          },
          cache: "no-cache",
          body: JSON.stringify({ params }),
        });

        const responseText = await response.text();
        
        // Detect HTML responses from infrastructure (indicates server booting or 404)
        if (responseText.includes("<!DOCTYPE html>") || responseText.includes("<html") || responseText.includes("Starting Server...")) {
          if (proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = 3000 * proxyRetries; // Slower backoff
            console.warn(`[AI Proxy] Server is booting (received HTML). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error("The backend server is taking longer than expected to start. Please refresh the page in a few moments.");
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[AI Proxy] Failed to parse JSON response. Status:", response.status);
          console.error("[AI Proxy] Response snippet:", responseText.substring(0, 200));
          throw new Error(`Server returned an invalid response (Status ${response.status}). The backend might still be warming up.`);
        }

        if (!response.ok) {
          const combinedErrorText = (data.error || "" + JSON.stringify(data)).toLowerCase();
          const isBilling = response.status === 402 || 
                           data.code === "BILLING_DEPLETED" || 
                           combinedErrorText.includes("prepayment credits are depleted") ||
                           combinedErrorText.includes("billing") ||
                           combinedErrorText.includes("credits are exhausted") ||
                           combinedErrorText.includes("resource_exhausted");

          if (isBilling) {
            throw new Error("AI functionality is temporarily limited due to API credit depletion. Please verify your Gemini API billing setup in AI Studio.");
          }
          
          const isRetryable = response.status === 503 || response.status === 429 || response.status === 504 || response.status === 502;
          if (isRetryable && proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = 2000 * proxyRetries;
            console.warn(`[AI Proxy] Server returned ${response.status}. Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error(data.error || `AI service returned error ${response.status}`);
        }
        
        // Robust 'text' property reconstruction for browser callers
        if (!data.text) {
          try {
            const parts = data.candidates?.[0]?.content?.parts || [];
            const textContent = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
            if (textContent) data.text = textContent;
          } catch (e) {}
        }
        
        return data;
      } catch (proxyError: any) {
        if (proxyRetries < MAX_PROXY_RETRIES) {
           proxyRetries++;
           const backoff = 3000 * proxyRetries;
           console.warn(`[AI Proxy] Network error (Failed to fetch). Possible server restart. Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
           await delay(backoff);
           continue;
        }
        console.error("[AI Proxy] Max retries exhausted for network error:", proxyError);
        throw new Error("Unable to connect to the AI service. Please check your internet connection or try again in a minute.");
      }
    }
    throw new Error("AI Request failed after multiple connection attempts.");
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
        
        // Model Fallback Logic (Sync with server.ts)
        if ((isQuotaExceeded || isProxyError || isNotFound)) {
          const oldModel = params.model;
          
          if (isQuotaExceeded) {
            console.warn(`[Client AI] ${oldModel} quota hit (429). Waiting 2s before fallback...`);
            await delay(2000);
          }

          if (params.model === 'gemini-3-flash-preview') {
            params.model = 'gemini-2.0-flash';
          } else if (params.model === 'gemini-2.0-flash') {
            params.model = 'gemini-flash-latest';
          } else if (params.model === 'gemini-flash-latest') {
            params.model = 'gemini-1.5-flash';
          } else if (params.model === 'gemini-1.5-flash') {
            params.model = 'gemini-1.5-flash-8b';
          } else if (params.model === 'gemini-1.5-flash-8b') {
            params.model = 'gemini-3.1-flash-lite';
          } else if (params.model === 'gemini-3.1-flash-lite') {
            params.model = 'gemini-flash-lite-latest';
          } else if (params.model === 'gemini-flash-lite-latest') {
            params.model = 'gemini-2.0-flash-lite';
          } else if (params.model === 'gemini-2.0-flash-lite') {
            params.model = 'gemini-2.5-flash';
          } else if (params.model === 'gemini-2.5-flash') {
            params.model = 'gemini-1.5-pro';
          } else if (params.model === 'gemini-1.5-pro') {
            params.model = 'gemini-1.5-pro-latest';
          } else {
            console.error(`[Client AI] All model fallbacks exhausted for ${oldModel}`);
            throw error;
          }

          // Disable tools as a last resort for broad compatibility if we reach this point in fallback
          if (params.tools && (params.model.includes('lite') || params.model.includes('latest'))) {
             delete params.tools;
             delete params.toolConfig;
          }
          
          console.warn(`[Client AI] Falling back from ${oldModel} to ${params.model}`);
          continue;
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
