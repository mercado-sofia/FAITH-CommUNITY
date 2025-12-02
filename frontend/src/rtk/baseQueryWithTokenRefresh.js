/**
 * Custom RTK Query Base Query with Automatic Token Refresh
 * Provides standardized base query creation with optional token refresh
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getValidAccessToken } from '@/utils/shared/tokenRefresh';
import { getBaseUrl } from '@/utils/getBaseUrl';

/**
 * Internal helper that handles 401 responses and retries with refreshed token
 * Tokens are now in httpOnly cookies, so refresh happens server-side
 */
const createReauthWrapper = (baseQuery) => {
  return async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    
    // If we get a 401, try refreshing token (works for all roles now!)
    if (result?.error?.status === 401) {
      // Try to refresh the token (token is in httpOnly cookie)
      const refreshed = await getValidAccessToken(true);
      
      if (refreshed) {
        // Retry the original query - new token is in cookie
        result = await baseQuery(args, api, extraOptions);
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