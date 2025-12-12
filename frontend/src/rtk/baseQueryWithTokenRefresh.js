/**
 * Custom RTK Query Base Query with Automatic Token Refresh
 * Provides standardized base query creation with optional token refresh
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getValidAccessToken, isRefreshTokenExpired } from '@/utils/shared/tokenRefresh';
import { getBaseUrl } from '@/utils/getBaseUrl';

/**
 * Internal helper that handles 401 responses and retries with refreshed token
 * Tokens are now in httpOnly cookies, so refresh happens server-side
 * Handles 401s silently - only propagates error if refresh token is expired
 */
const createReauthWrapper = (baseQuery) => {
  return async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    
    // If we get a 401, silently try refreshing token (works for all roles now!)
    if (result?.error?.status === 401) {
      // Silently attempt to refresh the token (token is in httpOnly cookie)
      // Use silent mode to prevent console errors during normal refresh
      const refreshed = await getValidAccessToken(true, true); // Force refresh, silent mode
      
      if (refreshed) {
        // Retry the original query - new token is in cookie
        // This is a silent refresh, no error is shown to user
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - check if refresh token is expired (non-recoverable)
        const refreshTokenExpired = await isRefreshTokenExpired();
        
        if (refreshTokenExpired) {
          // Refresh token is expired (after 7 days) - propagate error
          // This will trigger error handling in RTK Query
          return result; // Return original 401 error
        } else {
          // Access token expired but refresh token is still valid
          // This shouldn't happen if refresh succeeded, but handle gracefully
          // Retry once more in case of transient error
          const retryResult = await baseQuery(args, api, extraOptions);
          
          if (retryResult?.error?.status === 401) {
            // Still 401 after retry - refresh token must be expired
            return retryResult; // Return error
          }
          
          return retryResult; // Success after retry
        }
      }
    }
    
    return result;
  };
};

/**
 * Creates a standardized base query with consistent configuration
 * @param {string} basePath - The API base path (e.g., '/api', '/api/admins')
 * @param {boolean} useTokenRefresh - Whether to use token refresh wrapper (default: false)
 * @returns {Function} Configured base query function
 */
export const createBaseQuery = (basePath = '/api', useTokenRefresh = false) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: getBaseUrl(basePath),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers;
    },
  });

  // Return with or without token refresh wrapper
  if (useTokenRefresh) {
    return createReauthWrapper(baseQuery);
  }

  return baseQuery;
};

/**
 * Legacy export for backward compatibility
 * Uses default '/api' path with token refresh enabled
 * @deprecated Use createBaseQuery('/api', true) instead
 */
export const baseQueryWithReauth = createBaseQuery('/api', true);