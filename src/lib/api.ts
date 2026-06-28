/**
 * API utility to handle base URLs for different deployment environments.
 * When running on Surge (static only), VITE_API_BASE_URL should point to the Oracle Cloud VPS backend.
 */
export const getApiUrl = (path: string): string => {
  // Clear legacy custom backend URL to prevent stale manual routing issues
  if (typeof window !== 'undefined' && window.localStorage.getItem('CUSTOM_API_BASE_URL')) {
    window.localStorage.removeItem('CUSTOM_API_BASE_URL');
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = (rawBaseUrl || 'https://eight-webs-attend.loca.lt').trim();
  
  const relayUrl = (import.meta.env.VITE_API_RELAY_URL || 'https://ais-pre-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app').trim();
  
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isSurge = typeof window !== 'undefined' && window.location.hostname.includes('surge.sh');
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Safety/Relay Helper
  const resolveTarget = (targetBase: string) => {
    // If we are calling our own host via an absolute URL, just use relative path
    try {
      const urlObj = new URL(targetBase);
      if (urlObj.hostname === currentHostname) {
        return cleanPath;
      }
    } catch (e) { /* ignore */ }

    const isTargetHttp = targetBase.startsWith('http://');
    
    if (isHttps && isTargetHttp) {
      if (isSurge) {
        // Surge MUST use absolute relay URL because it has no local backend
        const cleanRelay = relayUrl.endsWith('/') ? relayUrl.slice(0, -1) : relayUrl;
        console.log(`[API Bridge] Surge Relay: ${path} -> ${cleanRelay}${cleanPath} (targeting ${targetBase})`);
        return `${cleanRelay}${cleanPath}`;
      }
      // run.app / dev can use relative paths which relay through their own local backend
      console.log(`[API Bridge] Local Relay: ${path} -> ${cleanPath} (targeting ${targetBase})`);
      return cleanPath;
    }

    const cleanBase = targetBase.endsWith('/') ? targetBase.slice(0, -1) : targetBase;
    return `${cleanBase}${cleanPath}`;
  };

  const isLocalStorageOrDev = 
    currentHostname === 'localhost' || 
    currentHostname === '127.0.0.1' || 
    currentHostname.includes('run.app') ||
    currentHostname.includes('google') ||
    currentHostname.includes('cloud') ||
    currentHostname.includes('aistudio.google');

  // If the user EXPLICITLY set a base URL, they likely want to use it regardless of env
  // unless they are hitting the same host as the app itself.
  if (rawBaseUrl) {
    return resolveTarget(rawBaseUrl);
  }

  // Otherwise, if we are in a known dev/preview env, use the local backend
  if (isLocalStorageOrDev && !isSurge) {
    return cleanPath;
  }

  // Fallback to the default VPS backend if not in local/preview
  if (baseUrl) {
    return resolveTarget(baseUrl);
  }
  
  return cleanPath;
};

/**
 * Universal fetch wrapper that automatically applies the API base URL.
 * Includes retries for network failures to handle transient connection hiccups.
 */
export const apiFetch = async (path: string, options: RequestInit = {}, retries = 2): Promise<Response> => {
  const url = getApiUrl(path);
  
  const executeFetch = async (attempt: number): Promise<Response> => {
    const controller = new AbortController();
    // Timeout of 90s for first attempt and 120s for retries to allow for server-side AI model fallbacks and responses
    const timeoutId = setTimeout(() => controller.abort(), attempt === 0 ? 90000 : 120000); 
    
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit', // Use omit to be safe for cross-origin if not using cookies
        headers: {
          ...options.headers,
        },
      };

      // Only add JSON content type if it's a POST/PUT with a body
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && options.body && !fetchOptions.headers?.hasOwnProperty('Content-Type')) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        };
      }

      console.log(`[apiFetch] Calling: ${url} (Mode: ${fetchOptions.mode}, Credentials: ${fetchOptions.credentials})`);
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      const isNetworkError = 
        (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message?.includes('NetworkError'))) ||
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message?.includes('failed to fetch');

      if (isNetworkError && attempt < retries) {
        console.warn(`[apiFetch] ${path} failed (attempt ${attempt + 1}/${retries + 1}). Retrying in 2s...`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return executeFetch(attempt + 1);
      }
      console.error(`[apiFetch] ${path} final error:`, error);
      throw error;
    }
  };

  return executeFetch(0);
};
