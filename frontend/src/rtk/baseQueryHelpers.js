/**
 * Helper utilities for creating standardized RTK Query base queries
 * Provides consistent configuration across all API modules
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';
import { baseQueryWithReauth } from './baseQueryWithTokenRefresh';

/**
 * Creates a standardized base query with consistent configuration
 * @param {string} basePath - The API base path (e.g., '/api', '/api/admins')
 * @param {boolean} useTokenRefresh - Whether to use token refresh wrapper (default: false)
 * @returns {Function} Configured base query function
 */
export const createBaseQuery = (basePath = '/api', useTokenRefresh = false) => {
  const getBaseUrl = () => {
    // In development, use relative paths for Next.js rewrites
    if (process.env.NODE_ENV === 'development') {
      return basePath;
    }
    return `${API_BASE_URL || ''}${basePath}`;
  };

  const baseQuery = fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers;
    },
  });

  // Return with or without token refresh wrapper
  if (useTokenRefresh) {
    return async (args, api, extraOptions) => {
      return await baseQueryWithReauth(args, api, extraOptions);
    };
  }

  return baseQuery;
};

/**
 * Standard base query for most APIs (without token refresh)
 * Use this for admin and superadmin APIs
 */
export const standardBaseQuery = createBaseQuery('/api', false);

/**
 * Base query with token refresh for public user APIs
 * Use this for public APIs that need automatic token refresh
 */
export const publicBaseQuery = createBaseQuery('/api', true);

