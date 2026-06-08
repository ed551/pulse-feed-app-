/**
 * API utility to handle base URLs for different deployment environments.
 * When running on Surge (static only), VITE_API_BASE_URL should point to the Render backend.
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  if (baseUrl) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${cleanBase}${cleanPath}`;
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
