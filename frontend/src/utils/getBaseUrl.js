/**
 * Shared utility for generating base URLs for RTK Query APIs
 * Centralizes the logic to eliminate duplication across API files
 * 
 * @param {string} basePath - The API base path (e.g., '/api', '/api/admins')
 * @returns {string} The full base URL for the API
 */
import { API_BASE_URL } from '@/config/api';

export const getBaseUrl = (basePath = '/api') => {
  // In development, use relative paths for Next.js rewrites
  if (process.env.NODE_ENV === 'development') {
    return basePath;
  }
  // In production, prepend API_BASE_URL if available
  return `${API_BASE_URL || ''}${basePath}`;
};

