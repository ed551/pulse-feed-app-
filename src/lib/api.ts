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
  const baseUrl = (rawBaseUrl || 'https://89-168-120-135.sslip.io').trim();
  const relayUrl = (import.meta.env.VITE_API_RELAY_URL || 'https://ais-pre-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app').trim();
  
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isSurge = typeof window !== 'undefined' && window.location.hostname.includes('surge.sh');
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Detect if we are in an AI Studio / Cloud Shell / Proxied environment
  const isProxied = currentHostname.includes('google') || 
                    currentHostname.includes('cloud') || 
                    currentHostname.includes('aistudio') ||
                    currentHostname.includes('editor') ||
                    currentHostname.includes('shell');

  const isRunApp = currentHostname.includes('run.app');
  const isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

  // If we are on Surge, all API requests MUST route to our own Cloud Run backend (relayUrl)
  if (isSurge) {
    const cleanRelay = relayUrl.endsWith('/') ? relayUrl.slice(0, -1) : relayUrl;
    return `${cleanRelay}${cleanPath}`;
  }

  // If we are actually ON a run.app URL (like in shared preview), use relative paths
  if (isRunApp && !isProxied) {
    return cleanPath;
  }

  // If we are in a proxied environment (AI Studio Editor), we must use the absolute relay URL
  if (isProxied && !isLocal) {
    // If the current origin itself is a run.app URL, we can use it as the relay
    // This happens if the user opens the preview in a new tab from the editor
    if (isRunApp) return cleanPath;

    const cleanRelay = relayUrl.endsWith('/') ? relayUrl.slice(0, -1) : relayUrl;
    return `${cleanRelay}${cleanPath}`;
  }

  // If we are local, use relative paths
  if (isLocal) {
    return cleanPath;
  }

  // If the user EXPLICITLY set a base URL, they likely want to use it regardless of env
  if (rawBaseUrl) {
    const cleanBase = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
    return `${cleanBase}${cleanPath}`;
  }

  // Fallback to the default VPS backend if not in local/preview
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${cleanPath}`;
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
        credentials: 'include', // Changed from omit to include for better auth compatibility
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
      console.log(`[apiFetch] Path: ${path}, UrlObj:`, new URL(url, window.location.origin));
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
