/**
 * Custom RTK Query Base Query with Automatic Token Refresh
 * Wraps fetchBaseQuery to handle automatic token refresh for public users
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';
import { getValidAccessToken } from '@/utils/tokenRefresh';

/**
 * Custom base query that handles token refresh for public users
 * For admin/superadmin, uses standard fetchBaseQuery
 */
export const baseQueryWithTokenRefresh = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // CRITICAL: Include httpOnly cookies
  prepareHeaders: (headers, { getState }) => {
    // Tokens are now in httpOnly cookies - no need to add Authorization header
    // Cookies are sent automatically with credentials: 'include'
    // This is more secure (XSS protection)
    return headers;
  },
});

/**
 * Wrapper that handles 401 responses and retries with refreshed token
 * Tokens are now in httpOnly cookies, so refresh happens server-side
 */
export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQueryWithTokenRefresh(args, api, extraOptions);
  
  // If we get a 401, try refreshing token (works for all roles now!)
  if (result?.error?.status === 401) {
    // Try to refresh the token (token is in httpOnly cookie)
    const refreshed = await getValidAccessToken(true);
    
    if (refreshed) {
      // Retry the original query - new token is in cookie
      result = await baseQueryWithTokenRefresh(args, api, extraOptions);
    }
  }
  
  return result;
};

