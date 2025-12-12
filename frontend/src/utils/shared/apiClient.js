/**
 * API Client with Automatic Token Refresh
 * Wraps fetch API to automatically refresh tokens when they expire
 * Handles 401 errors silently - only shows errors if refresh token is expired (after 7 days)
 */

import { API_BASE_URL } from '@/config/api';
import { getValidAccessToken, isRefreshTokenExpired } from './tokenRefresh';

/**
 * Make authenticated API request with automatic token refresh
 * Tokens are now in httpOnly cookies, so they're sent automatically
 * @param {string} url - API endpoint (relative or absolute)
 * @param {RequestInit} options - Fetch options
 * @param {string} userType - User type: 'user', 'admin', or 'superadmin' (for logging purposes)
 * @returns {Promise<Response>} - Fetch response
 */
export const authenticatedFetch = async (url, options = {}, userType = 'user') => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make authenticated request on server side');
  }

  // Determine if this is a full URL or relative path
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Prepare headers - tokens are in httpOnly cookies, so no Authorization header needed!
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Make the request - cookies are sent automatically with credentials: 'include'
  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // CRITICAL: Include httpOnly cookies
  });

  // Handle 401 Unauthorized - token might be expired, try silent refresh
  if (response.status === 401) {
    // Silently attempt to refresh the token (works for all roles now!)
    // Use silent mode to prevent console errors during normal refresh
    const refreshed = await getValidAccessToken(true, true); // Force refresh, silent mode
    
    if (refreshed) {
      // Retry the request - new token is in cookie
      // This is a silent refresh, user doesn't see any errors
      return fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      // Refresh failed - check if refresh token is expired (non-recoverable)
      const refreshTokenExpired = await isRefreshTokenExpired();
      
      if (refreshTokenExpired) {
        // Refresh token is expired (after 7 days) - user needs to log in again
        throw new Error('Session expired. Please log in again.');
      } else {
        // Access token expired but refresh token is still valid
        // This shouldn't happen if refresh succeeded, but handle gracefully
        // Retry once more in case of transient error
        const retryResponse = await fetch(fullUrl, {
          ...options,
          headers,
          credentials: 'include',
        });
        
        if (retryResponse.status === 401) {
          // Still 401 after retry - refresh token must be expired
          throw new Error('Session expired. Please log in again.');
        }
        
        return retryResponse;
      }
    }
  }

  return response;
};

/**
 * Make unauthenticated API request (public endpoints)
 * @param {string} url - API endpoint (relative or absolute)
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const publicFetch = async (url, options = {}) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make request on server side');
  }

  // Determine if this is a full URL or relative path
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Make the request
  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for CSRF tokens
  });
};

/**
 * Helper to parse JSON response with error handling
 * @param {Response} response - Fetch response
 * @returns {Promise<any>} - Parsed JSON data
 */
export const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      throw new Error('Invalid JSON response from server');
    }
  }
  
  // If not JSON, return text
  return await response.text();
};

