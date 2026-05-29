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

const MAX_RETRIES = 100;
const INITIAL_DELAY = 20000;

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 15000; 

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: any): Promise<GenerateContentResponse> {
  // 1. Detect Environment & Proxy if needed
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    let proxyRetries = 0;
    const MAX_PROXY_RETRIES = 30; // High resilience for infrastructure scaling/warmup

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
            "X-Client-Retry": proxyRetries.toString(),
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          },
          body: JSON.stringify({ params }),
        });

        // 503/502/504 Handling before text conversion
        if (response.status === 503 || response.status === 502 || response.status === 504) {
           if (proxyRetries < MAX_PROXY_RETRIES) {
              proxyRetries++;
              const backoff = 5000 * proxyRetries;
              console.warn(`[AI Proxy] Infrastructure warmup (${response.status}). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
              await delay(backoff);
              continue;
           }
        }

        const responseText = await response.text();
        
        // Detect HTML responses from infrastructure (indicates server booting or proxy overload)
        if (responseText.includes("<!DOCTYPE html>") || responseText.includes("<html") || responseText.includes("Starting Server...") || responseText.includes("Service Unavailable")) {
          if (proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = 5000 * proxyRetries; 
            console.warn(`[AI Proxy] Infrastructure block (Node warmup). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error("The infrastructure is warming up. Please wait a moment for the AI engine to initialize.");
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          if (proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = 2000 * proxyRetries;
            console.warn(`[AI Proxy] Invalid JSON response. Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error(`Server returned an invalid response (Status ${response.status}). The backend might still be warming up.`);
        }

        if (response.ok) {
          // Success!
        } else {
          const combinedErrorText = (data.error || "" + JSON.stringify(data)).toLowerCase();
          const isBilling = response.status === 402 || data.code === "BILLING_DEPLETED";
          const isRetryable = response.status === 503 || response.status === 429 || response.status === 504 || response.status === 502 || response.status === 500;
          
          if (isRetryable && proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = (isBilling ? 6000 : 3000) * proxyRetries;
            console.warn(`[AI Proxy] Service under load (${response.status}). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error(data.error || `AI service returned error ${response.status}${isBilling ? ' (Billing Exhausted)' : ''}`);
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
           const backoff = 5000 * proxyRetries;
           console.warn(`[AI Proxy] Network connection failed. Retrying with adaptive backoff in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
           await delay(backoff);
           continue;
        }
        console.error("[AI Proxy] Max retries exhausted for network error:", proxyError);
        throw new Error("Unable to establish a secure connection to the AI engine. This usually means the server is scaling up. Please wait 10 seconds.");
      }
    }
    throw new Error("AI Request failed after multiple connection attempts.");
  }

  // 2. Server-side implementation (existing logic)
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  let currentRelease: (() => void) | null = null;
  const acquireLock = async () => {
    const previousQueue = requestQueue;
    requestQueue = new Promise(resolve => { currentRelease = resolve; });
    await previousQueue;
  };

  await acquireLock();
  
  try {
    let retries = 0;
    
    while (retries <= MAX_RETRIES) {
      try {
        const response = await ai.models.generateContent(params);
        // Release queue after success plus interval
        const release = currentRelease;
        currentRelease = null;
        if (release) setTimeout(release, MIN_REQUEST_INTERVAL);
        return response;
      } catch (error: any) {
        const errorString = error?.message || (error?.toString ? error.toString() : "");
        const status = error?.status || 
                       (errorString.includes("404") || errorString.includes("NOT_FOUND") ? 404 : 
                        errorString.includes("429") || errorString.includes("QUOTA") ? 429 : 
                        errorString.includes("503") || errorString.includes("UNAVAILABLE") ? 503 : 500);

        const combinedErrorText = (errorString + " " + JSON.stringify(error)).toLowerCase();
        const isDepleted = combinedErrorText.includes("prepayment credits are depleted") || 
                          combinedErrorText.includes("billing") ||
                          combinedErrorText.includes("credits are exhausted") ||
                          combinedErrorText.includes("depleted") ||
                          combinedErrorText.includes("insufficient balance") ||
                          combinedErrorText.includes("credit") ||
                          status === 402;

        const isQuotaExceeded = status === 429 || combinedErrorText.includes("quota") || combinedErrorText.includes("resource_exhausted");
        const isProxyError = status === 500 || status === 503 || status === 504 || combinedErrorText.includes("xhr error") || combinedErrorText.includes("failed to fetch") || status === 502;
        const isNotFound = status === 404;
        
        // Model Fallback Logic (Sync with server.ts)
        if ((isQuotaExceeded || isProxyError || isNotFound || isDepleted)) {
          const oldModel = params.model;
          
          if (isQuotaExceeded || isDepleted) {
            retries++;
            const waitTime = isDepleted ? 15000 : 30000; // 15s for billing fallback, 30s for quota
            console.warn(`[Client AI] ${oldModel} error ${status}${isDepleted ? ' (BILLING)' : ''}. Attempt ${retries}. Waiting ${waitTime/1000}s before proactive fallback...`);
            
            if (currentRelease) {
              currentRelease();
              currentRelease = null;
            }
            await delay(waitTime);
            await acquireLock();
          }

          // If billing is depleted, strictly use free tier candidates ONLY
          if (isDepleted) {
            const currentModel = params.model;
            if (currentModel === 'gemini-3-flash-preview' || currentModel === 'gemini-2.0-flash') {
              params.model = 'gemini-3.5-flash';
              console.warn(`[Client AI] Billing issue. Switching to free tier: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-3.5-flash') {
              params.model = 'gemini-flash-latest';
              console.warn(`[Client AI] Trying reliable flash fallback: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-flash-latest') {
              params.model = 'gemini-1.5-flash';
              console.warn(`[Client AI] Trying base flash: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-1.5-flash') {
              params.model = 'gemini-1.5-flash-8b';
              console.warn(`[Client AI] Trying micro flash: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-1.5-flash-8b') {
              params.model = 'gemini-3.1-flash-lite';
              console.warn(`[Client AI] Trying lite free tier: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-3.1-flash-lite') {
              params.model = 'gemini-3.1-pro-preview';
              console.warn(`[Client AI] Trying pro fallback: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-3.1-pro-preview') {
              params.model = 'gemini-1.5-pro';
              console.warn(`[Client AI] Trying base pro: ${params.model}`);
              continue;
            } else if (currentModel === 'gemini-1.5-pro') {
              params.model = 'gemini-2.0-flash-exp';
              console.warn(`[Client AI] Trying next-gen flash exp: ${params.model}`);
              continue;
            } else {
              console.error("[Client AI] All free-tier candidates exhausted during billing depletion.");
              throw error;
            }
          }

          const currentModel = params.model;
          if (currentModel === 'gemini-3-flash-preview' || currentModel === 'gemini-2.0-flash') {
            params.model = 'gemini-3.5-flash';
          } else if (currentModel === 'gemini-3.5-flash') {
            params.model = 'gemini-flash-latest';
          } else if (currentModel === 'gemini-flash-latest') {
            params.model = 'gemini-1.5-flash';
          } else if (currentModel === 'gemini-1.5-flash') {
            params.model = 'gemini-1.5-flash-8b';
          } else if (currentModel === 'gemini-1.5-flash-8b') {
            params.model = 'gemini-3.1-flash-lite';
          } else if (currentModel === 'gemini-3.1-flash-lite') {
            params.model = 'gemini-3.1-pro-preview';
          } else if (currentModel === 'gemini-3.1-pro-preview') {
            params.model = 'gemini-1.5-pro';
          } else if (currentModel === 'gemini-1.5-pro') {
            params.model = 'gemini-2.0-flash-exp';
          } else {
            params.model = 'gemini-1.5-flash-8b';
          }
          
          if (params.model === oldModel) {
            console.error(`[Client AI] All model fallbacks exhausted for ${oldModel}`);
            throw error;
          }
          
          console.warn(`[Client AI] Falling back from ${oldModel} to ${params.model}`);
          continue;
        }


        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          // Exponential backoff with jitter and increased delay for higher retries
          const backoffDelay = (INITIAL_DELAY * Math.pow(1.5, retries)) + (Math.random() * 2000); 
          console.warn(`AI service under load (Status: ${status}). Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          
          if (currentRelease) {
            currentRelease();
            currentRelease = null;
          }
          await delay(backoffDelay);
          await acquireLock();

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
    if (currentRelease) {
      currentRelease();
    }
  }
}
