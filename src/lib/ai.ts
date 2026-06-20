import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { getApiUrl } from "./api";

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

const MAX_RETRIES = 5;
const INITIAL_DELAY = 30000;

let requestQueue: Promise<void> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 20000; 
let isAIBreakerTripped = false;
let breakerErrorText = "";

export const getAIBreakerStatus = () => ({
  isTripped: isAIBreakerTripped,
  errorText: breakerErrorText
});

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContentWithRetry(params: any): Promise<any> {
  if (isAIBreakerTripped) {
    throw new Error(`AI Service Suspended: ${breakerErrorText}`);
  }

  // 1. Detect Environment & Proxy if needed
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    let proxyRetries = 0;
    const MAX_PROXY_RETRIES = 30; // High resilience for infrastructure scaling/warmup

    while (proxyRetries <= MAX_PROXY_RETRIES) {
      try {
        const targetUrl = getApiUrl('/api/gemini/generate');
        if (proxyRetries === 0) {
          console.debug(`[AI Proxy] Starting request to: ${targetUrl}`);
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
              console.debug(`[AI Proxy] Infrastructure warmup (${response.status}). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
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
            console.debug(`[AI Proxy] Infrastructure block (Node warmup). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
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
            console.debug(`[AI Proxy] Invalid JSON response. Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error(`Server returned an invalid response (Status ${response.status}). The backend might still be warming up.`);
        }

        if (response.ok) {
          // Success!
        } else {
          const errorMsg = data?.error || (data ? JSON.stringify(data) : "Unknown Error");
          const combinedErrorText = errorMsg.toLowerCase();
          const isBilling = response.status === 402 || 
                            data?.code === "BILLING_DEPLETED" || 
                            combinedErrorText.includes("billing") || 
                            combinedErrorText.includes("depleted");
          const isRetryable = response.status === 503 || response.status === 429 || response.status === 504 || response.status === 502 || response.status === 500;
          
          const isBlocked = response.status === 403 || combinedErrorText.includes("permission denied") || combinedErrorText.includes("dunning") || combinedErrorText.includes("lightning dunning");
          
          if (isBlocked) {
            isAIBreakerTripped = true;
            breakerErrorText = combinedErrorText.includes("dunning") 
              ? "Your Google Cloud Project billing has been restricted (Dunning). Please check your GCP console billing settings to restore Gemini API access."
              : (data?.error || errorMsg);
            console.error(`[AI Proxy] CIRCUIT BREAKER TRIPPED: ${breakerErrorText}. Stopping all future AI interactions for this session.`);
            throw new Error(breakerErrorText);
          }

          if (isRetryable && proxyRetries < MAX_PROXY_RETRIES) {
            proxyRetries++;
            const backoff = (isBilling ? 6000 : 3000) * proxyRetries;
            console.debug(`[AI Proxy] Service under load (${response.status}). Retrying in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
            await delay(backoff);
            continue;
          }
          throw new Error(data?.error || `AI service returned error ${response.status}${isBilling ? ' (Billing Exhausted)' : ''}`);
        }
        
        // Robust 'text' property reconstruction for browser callers
        if (data && !data.text) {
          try {
            const rawResponse = data.response || data;
            const parts = rawResponse.candidates?.[0]?.content?.parts || [];
            const textContent = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
            if (textContent) data.text = textContent;
          } catch (e) {}
        }
        
        return data;
      } catch (proxyError: any) {
        if (proxyRetries < MAX_PROXY_RETRIES) {
           proxyRetries++;
           const backoff = 5000 * proxyRetries;
           console.debug(`[AI Proxy] Network connection failed. Retrying with adaptive backoff in ${backoff}ms... (${proxyRetries}/${MAX_PROXY_RETRIES})`);
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
        if (params && !params.model) params.model = 'gemini-3-flash-preview';
        
        // Normalize contents format per AGENTS.md
        if (params.contents && !Array.isArray(params.contents) && typeof params.contents === 'string') {
          params.contents = [{ role: 'user', parts: [{ text: params.contents }] }];
        } else if (params.prompt && !params.contents) {
          params.contents = [{ role: 'user', parts: [{ text: params.prompt }] }];
          delete params.prompt;
        }

        const response = await (ai as any).models.generateContent(params);
        
        // Final normalization to ensure .text is a string for all callers
        const responseText = (typeof response.text === 'function') ? response.text() : 
                           (response.text || response.response?.candidates?.[0]?.content?.parts?.[0]?.text || "");
        
        // Wrap response to be ultra-compatible with varied client expectations
        const result = {
          text: responseText,
          response: response.response || response,
          candidates: response.candidates || response.response?.candidates || []
        };

        // Release queue after success plus interval
        const release = currentRelease;
        currentRelease = null;
        if (release) setTimeout(release, MIN_REQUEST_INTERVAL);
        return result;
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
                          combinedErrorText.includes("billing_depleted") ||
                          status === 402;

        const isQuotaExceeded = status === 429 || combinedErrorText.includes("quota") || combinedErrorText.includes("resource_exhausted");
        const isProxyError = status === 500 || status === 503 || status === 504 || combinedErrorText.includes("xhr error") || combinedErrorText.includes("failed to fetch") || status === 502;
        const isNotFound = status === 404;
        const isBlocked = status === 403 || combinedErrorText.includes("permission denied") || combinedErrorText.includes("dunning") || combinedErrorText.includes("lightning dunning");

        // Blocked/Dunning is terminal - stop immediately
        if (isBlocked) {
          isAIBreakerTripped = true;
          breakerErrorText = combinedErrorText.includes("dunning")
            ? "Google Gemini API Error: Project billing is restricted (Dunning). Please check your GCP console billing dashboard."
            : errorString;
          console.error(`[Client AI] CIRCUIT BREAKER TRIPPED: ${breakerErrorText}. Access Denied - stopping all future retries.`);
          const release = currentRelease;
          currentRelease = null;
          if (release) release();
          throw new Error(breakerErrorText);
        }
        
          // Model Fallback Logic (Sync with server.ts)
          if ((isQuotaExceeded || isProxyError || isNotFound || isDepleted)) {
            retries++;
            const oldModel = params.model;
            
            if (isQuotaExceeded || isDepleted) {
              const waitTime = isDepleted ? 60000 : 30000; // 60s for billing fallback, 30s for quota
              console.debug(`[Client AI] ${oldModel} error ${status}${isDepleted ? ' (BILLING)' : ''}. Mandatory recovery delay of ${waitTime/1000}s. (Attempt ${retries}/${MAX_RETRIES})`);
              
              if (isDepleted && retries >= 1) {
                console.error("[Client AI] Billing/Quota issues detected. Please check your AI Studio credits.");
                throw error;
              }

              // HOLD THE LOCK to prevent loop hammering
              await delay(waitTime);
            }

            const currentModel = params.model;
            // Robust Fallback Sequence based on User Instructions (AGENTS.md)
            if (currentModel === 'gemini-3-flash-preview') {
              params.model = 'gemini-3.5-flash';
            } else if (currentModel === 'gemini-3.5-flash') {
              params.model = 'gemini-flash-latest';
            } else if (currentModel === 'gemini-flash-latest') {
              params.model = 'gemini-3.1-flash-lite';
            } else if (currentModel === 'gemini-3.1-flash-lite') {
              params.model = 'gemini-3.1-pro-preview';
            } else if (currentModel === 'gemini-3.1-pro-preview') {
              params.model = 'gemini-1.5-flash';
            } else if (currentModel === 'gemini-1.5-flash') {
              params.model = 'gemini-1.5-flash-8b';
            } else {
              // Loop back to primary
              params.model = 'gemini-3-flash-preview';
            }
            
            if (retries >= MAX_RETRIES) {
              console.error(`[Client AI] All model fallbacks and retries exhausted (${MAX_RETRIES}).`);
              throw error;
            }
            
            console.debug(`[Client AI] Falling back from ${oldModel} to ${params.model} (Attempt ${retries}/${MAX_RETRIES})`);
            continue;
          }


        if ((isQuotaExceeded || isProxyError) && retries < MAX_RETRIES) {
          retries++;
          // Exponential backoff with jitter and increased delay for higher retries
          const backoffDelay = (INITIAL_DELAY * Math.pow(1.5, retries)) + (Math.random() * 2000); 
          console.warn(`AI service under load (Status: ${status}). Mandatory recovery delay of ${Math.round(backoffDelay)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
          
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
    if (currentRelease) {
      currentRelease();
    }
  }
}
