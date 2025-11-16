/**
 * API Helper Utility
 * Centralized helper for making authenticated API calls with cookies
 */

import { API_BASE_URL } from '@/config/api';

/**
 * Make an authenticated API request using httpOnly cookies
 * @param {string} endpoint - API endpoint (relative path, e.g., '/api/users/profile')
 * @param {RequestInit} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export async function makeApiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL || ''}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultOptions = {
    credentials: 'include', // CRITICAL: Include httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header needed - httpOnly cookies handle authentication
      ...options.headers,
    },
  };

  // Don't override Content-Type if it's FormData (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions);
}

/**
 * Make an authenticated API request and parse JSON response
 * @param {string} endpoint - API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{data: any, response: Response}>} Parsed data and response
 */
export async function makeApiRequestJson(endpoint, options = {}) {
  const response = await makeApiRequest(endpoint, options);
  const data = await response.json();
  return { data, response };
}

