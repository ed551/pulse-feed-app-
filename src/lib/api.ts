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
  // We automatically route to the Render backend when deployed to Surge or a static environment to prevent 404s.
  // CRITICAL: On Cloud Run (.run.app), localhost, google domains, or dev workspaces, we must use our own local backend routes.
  const isLocalStorageOrDev = 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('google') ||
    window.location.hostname.includes('cloud');

  if (!isLocalStorageOrDev) {
    const fallbackBaseUrl = 'https://pulse-feeds-server.onrender.com';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const finalUrl = `${fallbackBaseUrl}/${cleanPath}`;
    console.log(`[API Proxy Fallback] Routing ${path} -> ${finalUrl}`);
    return finalUrl;
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
