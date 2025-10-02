/**
 * Admin and Superadmin Authentication Utilities
 * Handles token validation, refresh attempts, and secure redirects for both admin and superadmin users
 */

import { clearAuthImmediate, USER_TYPES } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Clear all authentication data and redirect to login
 * Now uses centralized cleanup for security
 */
export const clearAuthAndRedirect = (userType = 'admin') => {
  // Use centralized immediate cleanup for security
  const userTypeEnum = userType === 'admin' ? USER_TYPES.ADMIN : USER_TYPES.SUPERADMIN;
  clearAuthImmediate(userTypeEnum);
  window.location.href = '/login';
};

/**
 * Check if token is expired (basic check without server validation)
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  // Handle hardcoded superadmin token
  if (token === "superadmin") {
    return false; // Never expires
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true; // If we can't parse, consider it expired
  }
};

/**
 * Get user type from token
 */
export const getUserTypeFromToken = (token) => {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch (error) {
    return null;
  }
};

/**
 * Make authenticated API request with automatic token validation
 */
export const makeAuthenticatedRequest = async (url, options = {}, userType = 'admin') => {
  const tokenKey = userType === 'admin' ? 'adminToken' : 'superAdminToken';
  const token = localStorage.getItem(tokenKey);
  
  // Check if token exists
  if (!token) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  // Handle 401 responses (token invalid/expired)
  if (response.status === 401) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server returned an invalid response. Please try again.');
  }
  
  return response;
};

/**
 * Validate token and get user data
 */
export const validateTokenAndGetUser = async (userType = 'admin') => {
  const tokenKey = userType === 'admin' ? 'adminToken' : 'superAdminToken';
  const dataKey = userType === 'admin' ? 'adminData' : 'superAdminData';
  const token = localStorage.getItem(tokenKey);
  const userData = localStorage.getItem(dataKey);
  
  // Check if token exists
  if (!token) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // If we have user data, return it
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (error) {
      // Invalid user data, will be refetched
    }
  }
  
  // If no user data, try to fetch it from the server
  try {
    const profileUrl = userType === 'admin' 
      ? `${API_BASE_URL}/api/admin/profile`
      : `${API_BASE_URL}/api/superadmin/auth/profile/${JSON.parse(localStorage.getItem(dataKey))?.id}`;
    
    const response = await makeAuthenticatedRequest(profileUrl, { method: 'GET' }, userType);
    if (!response) return null;
    
    const data = await response.json();
    if (response.ok) {
      // Store the updated user data
      localStorage.setItem(dataKey, JSON.stringify(data));
      return data;
    }
  } catch (error) {
  }
  
  return null;
};

/**
 * Show user-friendly error message for authentication issues
 */
export const showAuthError = (message = 'Your session has expired. Please log in again.') => {
  // You can customize this to show a modal, toast, or other UI element
  // For now, using a more user-friendly approach
  if (typeof window !== 'undefined') {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 16px 24px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
};

/**
 * Check authentication status on page load
 */
export const checkAuthStatus = (userType = 'admin') => {
  const tokenKey = userType === 'admin' ? 'adminToken' : 'superAdminToken';
  const token = localStorage.getItem(tokenKey);
  
  if (!token || isTokenExpired(token)) {
    clearAuthAndRedirect(userType);
    return false;
  }
  
  return true;
};
