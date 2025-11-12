/**
 * Token Refresh Utility
 * Handles automatic token refresh for public users using refresh tokens stored in httpOnly cookies
 */

import { API_BASE_URL } from '@/config/api';

/**
 * Check if a token is expired or will expire soon
 * @param {string} token - JWT token
 * @param {number} bufferSeconds - Buffer time in seconds before expiration (default: 60 seconds)
 * @returns {boolean} - True if token is expired or will expire soon
 */
export const isTokenExpiredOrExpiringSoon = (token, bufferSeconds = 60) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const bufferTime = bufferSeconds * 1000;
    const now = Date.now();
    
    // Token is expired or will expire within buffer time
    return expirationTime <= (now + bufferTime);
  } catch (error) {
    return true; // If we can't parse, consider it expired
  }
};

/**
 * Refresh access token using refresh token cookie
 * @returns {Promise<string|null>} - New access token or null if refresh failed
 */
export const refreshAccessToken = async () => {
  try {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/users/refresh`, {
      method: 'POST',
      credentials: 'include', // Important: Include cookies (refresh_token)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      return null;
    }

    const data = await response.json();
    
    if (data.token) {
      // Update localStorage with new access token
      localStorage.setItem('userToken', data.token);
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

/**
 * Get current access token, refreshing if needed
 * @param {boolean} forceRefresh - Force refresh even if token is still valid
 * @returns {Promise<string|null>} - Valid access token or null
 */
export const getValidAccessToken = async (forceRefresh = false) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    return null;
  }

  const currentToken = localStorage.getItem('userToken');
  
  if (!currentToken) {
    return null;
  }

  // Check if token needs refresh
  if (forceRefresh || isTokenExpiredOrExpiringSoon(currentToken)) {
    const newToken = await refreshAccessToken();
    return newToken || currentToken; // Return new token or fallback to current
  }

  return currentToken;
};

