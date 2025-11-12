/**
 * API Client with Automatic Token Refresh
 * Wraps fetch API to automatically refresh tokens when they expire
 */

import { API_BASE_URL } from '@/config/api';
import { getValidAccessToken, isTokenExpiredOrExpiringSoon } from './tokenRefresh';

/**
 * Make authenticated API request with automatic token refresh
 * @param {string} url - API endpoint (relative or absolute)
 * @param {RequestInit} options - Fetch options
 * @param {string} userType - User type: 'user', 'admin', or 'superadmin'
 * @returns {Promise<Response>} - Fetch response
 */
export const authenticatedFetch = async (url, options = {}, userType = 'user') => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make authenticated request on server side');
  }

  // Determine if this is a full URL or relative path
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Get token based on user type
  let token = null;
  let tokenKey = null;

  switch (userType) {
    case 'user':
      tokenKey = 'userToken';
      // For public users, use token refresh mechanism
      token = await getValidAccessToken();
      break;
    case 'admin':
      tokenKey = 'adminToken';
      token = localStorage.getItem(tokenKey);
      break;
    case 'superadmin':
      tokenKey = 'superAdminToken';
      token = localStorage.getItem(tokenKey);
      break;
    default:
      token = localStorage.getItem('userToken');
  }

  // Check if token exists
  if (!token) {
    throw new Error('No authentication token found');
  }

  // For admin/superadmin, check if token is expired
  if (userType !== 'user' && isTokenExpiredOrExpiringSoon(token)) {
    throw new Error('Token expired');
  }

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make the request
  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // Important: Include cookies for refresh tokens
  });

  // Handle 401 Unauthorized - token might be expired
  if (response.status === 401 && userType === 'user') {
    // Try refreshing the token once
    const newToken = await getValidAccessToken(true); // Force refresh
    
    if (newToken) {
      // Retry the request with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      // Refresh failed - user needs to log in again
      throw new Error('Session expired. Please log in again.');
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

