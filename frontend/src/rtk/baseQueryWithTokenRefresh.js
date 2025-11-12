/**
 * Custom RTK Query Base Query with Automatic Token Refresh
 * Wraps fetchBaseQuery to handle automatic token refresh for public users
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';
import { getValidAccessToken, isTokenExpiredOrExpiringSoon } from '@/utils/tokenRefresh';

/**
 * Custom base query that handles token refresh for public users
 * For admin/superadmin, uses standard fetchBaseQuery
 */
export const baseQueryWithTokenRefresh = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // Include cookies for refresh tokens
  prepareHeaders: (headers, { getState }) => {
    // Check if this is a public user request
    const userToken = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    const superAdminToken = typeof window !== 'undefined' ? localStorage.getItem('superAdminToken') : null;
    
    // Determine which token to use (priority: superadmin > admin > user)
    let token = null;
    
    if (superAdminToken) {
      token = superAdminToken;
    } else if (adminToken) {
      token = adminToken;
    } else if (userToken) {
      token = userToken;
    }
    
    // Add authorization header if token exists
    // Token refresh will be handled in baseQueryWithReauth wrapper
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

/**
 * Wrapper that handles 401 responses and retries with refreshed token
 * Also proactively refreshes tokens before they expire
 */
export const baseQueryWithReauth = async (args, api, extraOptions) => {
  // Check if this is a public user request and token needs refresh
  const userToken = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
  
  // Proactively refresh token if it's expiring soon (before making the request)
  if (userToken && isTokenExpiredOrExpiringSoon(userToken)) {
    await getValidAccessToken(true);
  }
  
  let result = await baseQueryWithTokenRefresh(args, api, extraOptions);
  
  // If we get a 401 and this is a public user request, try refreshing token
  if (result?.error?.status === 401 && userToken) {
    // Try to refresh the token
    const newToken = await getValidAccessToken(true);
    
    if (newToken) {
      // Retry the original query with new token
      result = await baseQueryWithTokenRefresh(args, api, extraOptions);
    }
  }
  
  return result;
};

