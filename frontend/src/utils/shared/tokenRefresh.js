/**
 * Token Refresh Utility
 * Handles automatic token refresh for all user types (public, admin, superadmin)
 * using refresh tokens stored in httpOnly cookies
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
 * Check if refresh token is expired (non-recoverable error)
 * This checks if the refresh token itself has expired (after 7 days)
 * Note: This function attempts a refresh to check validity, which will rotate the token
 * if valid. This is acceptable as it's only called when we need to determine if we should
 * show an error to the user.
 * @returns {Promise<boolean>} - True if refresh token is expired, false otherwise
 */
export const isRefreshTokenExpired = async () => {
  try {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      return true; // Assume expired on server side
    }

    // Try to refresh - if this fails, refresh token is expired
    // Note: If refresh succeeds, the token will be rotated, which is fine
    // as we're checking this when we need to determine if we should show an error
    const response = await fetch(`${API_BASE_URL}/api/users/refresh`, {
      method: 'POST',
      credentials: 'include', // Important: Include cookies (refresh_token)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If refresh fails, refresh token is expired
    return !response.ok;
  } catch (error) {
    // If there's an error, assume refresh token is expired
    return true;
  }
};

/**
 * Refresh access token using refresh token cookie
 * Tokens are now stored in httpOnly cookies, so we just need to call the endpoint
 * @param {boolean} silent - If true, don't log errors (for silent refresh)
 * @returns {Promise<boolean>} - True if refresh succeeded, false otherwise
 */
export const refreshAccessToken = async (silent = false) => {
  try {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      return false;
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
      return false;
    }

    // Token is now in httpOnly cookie, no need to store in localStorage
    return true;
  } catch (error) {
    // Only log error if not in silent mode
    if (!silent) {
      console.error('Error refreshing token:', error);
    }
    return false;
  }
};

/**
 * Get valid access token, refreshing if needed
 * Since tokens are in httpOnly cookies, we just check auth status via API
 * @param {boolean} forceRefresh - Force refresh even if token is still valid
 * @param {boolean} silent - If true, don't log errors (for silent refresh)
 * @returns {Promise<boolean>} - True if token is valid/refreshed, false otherwise
 */
export const getValidAccessToken = async (forceRefresh = false, silent = false) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    return false;
  }

  // Check auth status from backend (reads from httpOnly cookie)
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Prevent caching of auth status
    });
  
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    
    if (data.authenticated) {
      return true;
    }

    // If not authenticated but can refresh, try refresh
    if (data.needsRefresh || forceRefresh) {
      return await refreshAccessToken(silent);
    }

    return false;
  } catch (error) {
    // Only log error if not in silent mode
    if (!silent) {
      console.error('Error checking auth status:', error);
    }
    return false;
  }
};

