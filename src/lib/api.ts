/**
 * API utility to handle base URLs for different deployment environments.
 * When running on Surge (static only), VITE_API_BASE_URL should point to the Render backend.
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  if (baseUrl) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const finalUrl = `${cleanBase}${cleanPath}`;
    console.log(`[API Proxy] Routing ${path} -> ${finalUrl}`);
    return finalUrl;
  }
  
  // Diagnostic for Surge/Production deployments without backend URL
  if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    if (!baseUrl && path.startsWith('/api/')) {
      console.warn(`[API Proxy Warning] Direct API call to ${path} on a non-localhost origin (${window.location.hostname}) without VITE_API_BASE_URL configured. Static hosts like Surge will return 404.`);
    }
  }
  
  return path;
};

/**
 * Universal fetch wrapper that automatically applies the API base URL.
 */
export const apiFetch = async (path: string, options?: RequestInit): Promise<Response> => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
