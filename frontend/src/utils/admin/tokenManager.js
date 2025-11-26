/**
 * Centralized Token Management Utility
 * Provides secure, consistent access to admin tokens with proper error handling
 */

import { isTokenExpired, clearAuthAndRedirect } from '@/utils/shared/portalAuth';
import logger from '@/utils/shared/logger';

const TOKEN_KEY = 'adminToken';
const DATA_KEY = 'adminData';

/**
 * Safely get admin token from localStorage
 * @returns {string|null} The admin token or null if not available/expired
 */
export const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      // Clear expired token
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(DATA_KEY);
      return null;
    }
    
    return token;
  } catch (error) {
    logger.error('Failed to access localStorage for token', error);
    return null;
  }
};

/**
 * Safely get admin data from localStorage
 * @returns {object|null} The admin data or null if not available
 */
export const getAdminData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(DATA_KEY);
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to parse admin data from localStorage', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(DATA_KEY);
    } catch (e) {
      // Ignore cleanup errors
    }
    return null;
  }
};

/**
 * Check if admin is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export const isAdminAuthenticated = () => {
  const token = getAdminToken();
  const data = getAdminData();
  return !!(token && data);
};

/**
 * Safely set admin token (for internal use only)
 * @param {string} token - The token to store
 */
export const setAdminToken = (token) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    logger.error('Failed to store admin token', error);
    throw new Error('Failed to store authentication token');
  }
};

/**
 * Safely set admin data (for internal use only)
 * @param {object} data - The admin data to store
 */
export const setAdminData = (data) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Failed to store admin data', error);
    throw new Error('Failed to store admin data');
  }
};

/**
 * Clear admin authentication data
 */
export const clearAdminAuth = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DATA_KEY);
  } catch (error) {
    logger.error('Failed to clear admin auth data', error);
  }
};

/**
 * Get admin token with automatic redirect on failure
 * Note: Since we're using httpOnly cookies, we don't actually need the token
 * This function now just checks if admin is authenticated via adminData
 * @returns {string|null} Returns a placeholder token string or null (will redirect if not authenticated)
 */
export const getAdminTokenOrRedirect = () => {
  // Since we're using httpOnly cookies, check for adminData instead of token
  // The actual authentication is handled by cookies sent with requests
  const data = getAdminData();
  
  if (!data) {
    clearAuthAndRedirect('admin');
    return null;
  }
  
  // Return a placeholder since we don't actually use the token anymore
  // The real authentication is via httpOnly cookies
  return 'cookie-based-auth';
};

