/**
 * Custom RTK Query Base Query with Automatic Token Refresh
 * Provides standardized base query creation with optional token refresh
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getValidAccessToken, isRefreshTokenExpired } from '@/utils/shared/tokenRefresh';
import { getBaseUrl } from '@/utils/getBaseUrl';
import {
  isForceFallback,
  markFallbackUsed,
  shouldFallbackOnError,
} from '@/config/fallback';
import { normalizeFallbackPath, resolveFallbackApi } from '@/data';

function getFallbackLookupUrl(basePath, args) {
  const path = typeof args === 'string' ? args : args?.url || '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = getBaseUrl(basePath);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    try {
      return new URL(normalizedPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href;
    } catch {
      return `${baseUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
    }
  }
  const combined = `${baseUrl}${normalizedPath}`.replace(/\/+/g, '/');
  return combined.startsWith('/') ? combined : `/${combined}`;
}

function applyGetFallback(basePath, args) {
  const method = (typeof args === 'string' ? 'GET' : args?.method || 'GET').toUpperCase();
  if (method !== 'GET') return null;

  const lookupUrl = getFallbackLookupUrl(basePath, args);
  const fallback = resolveFallbackApi(lookupUrl, { method });
  if (fallback === null) return null;

  const path = normalizeFallbackPath(lookupUrl);
  if (!path.startsWith('/api/')) return null;

  markFallbackUsed();
  return { data: fallback };
}

/**
 * Internal helper that handles 401 responses and retries with refreshed token
 * Tokens are now in httpOnly cookies, so refresh happens server-side
 * Handles 401s silently - only propagates error if refresh token is expired
 */
const createReauthWrapper = (baseQuery, basePath) => {
  return async (args, api, extraOptions) => {
    if (isForceFallback()) {
      const forced = applyGetFallback(basePath, args);
      if (forced) return forced;
    }

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

    if (result?.error && shouldFallbackOnError(result.error)) {
      const fallbackResult = applyGetFallback(basePath, args);
      if (fallbackResult) return fallbackResult;
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
const createFallbackWrapper = (baseQuery, basePath) => {
  return async (args, api, extraOptions) => {
    if (isForceFallback()) {
      const forced = applyGetFallback(basePath, args);
      if (forced) return forced;
    }

    const result = await baseQuery(args, api, extraOptions);

    if (result?.error && shouldFallbackOnError(result.error)) {
      const fallbackResult = applyGetFallback(basePath, args);
      if (fallbackResult) return fallbackResult;
    }

    return result;
  };
};

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

  if (useTokenRefresh) {
    return createReauthWrapper(baseQuery, basePath);
  }

  return createFallbackWrapper(baseQuery, basePath);
};

/**
 * Legacy export for backward compatibility
 * Uses default '/api' path with token refresh enabled
 * @deprecated Use createBaseQuery('/api', true) instead
 */
export const baseQueryWithReauth = createBaseQuery('/api', true);