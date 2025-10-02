/**
 * Centralized Authentication Service
 * Handles all authentication operations including logout for all user types
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * User types in the system
 */
export const USER_TYPES = {
  PUBLIC: 'public',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

/**
 * Authentication data keys for each user type
 */
const AUTH_KEYS = {
  [USER_TYPES.PUBLIC]: {
    token: 'userToken',
    data: 'userData',
    apiEndpoint: '/api/users/logout'
  },
  [USER_TYPES.ADMIN]: {
    token: 'adminToken',
    data: 'adminData',
    apiEndpoint: null // Admin doesn't have logout API endpoint
  },
  [USER_TYPES.SUPERADMIN]: {
    token: 'superAdminToken',
    data: 'superAdminData',
    apiEndpoint: null // Superadmin doesn't have logout API endpoint
  }
};

/**
 * Common localStorage keys that need to be cleared
 */
const COMMON_KEYS = [
  'token',
  'userRole',
  'userEmail',
  'userName'
];

/**
 * Clear authentication data from localStorage and cookies
 */
export const clearAuthData = (userType = USER_TYPES.PUBLIC) => {
  const authKeys = AUTH_KEYS[userType];
  
  // Clear user-specific data
  if (authKeys) {
    localStorage.removeItem(authKeys.token);
    localStorage.removeItem(authKeys.data);
  }
  
  // Clear common keys
  COMMON_KEYS.forEach(key => localStorage.removeItem(key));
  
  // Clear cookies
  document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

/**
 * Immediate authentication cleanup for system-level failures
 * No delays, no events, no redirects - just secure cleanup
 */
export const clearAuthImmediate = (userType = USER_TYPES.PUBLIC) => {
  const authKeys = AUTH_KEYS[userType];
  
  // Clear user-specific data
  if (authKeys) {
    localStorage.removeItem(authKeys.token);
    localStorage.removeItem(authKeys.data);
  }
  
  // Clear ALL common keys (security critical)
  COMMON_KEYS.forEach(key => localStorage.removeItem(key));
  
  // Clear additional keys that might exist
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  
  // Clear ALL cookies (security critical)
  document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // No redirect, no delays, no events - immediate cleanup only
};

/**
 * Call logout API endpoint (only for public users)
 */
const callLogoutAPI = async (userType) => {
  const authKeys = AUTH_KEYS[userType];
  
  if (!authKeys?.apiEndpoint) {
    return; // No API endpoint for admin/superadmin
  }
  
  const token = localStorage.getItem(authKeys.token);
  if (!token) return;
  
  try {
    await fetch(`${API_BASE_URL}${authKeys.apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Continue with client-side cleanup even if API fails
  }
};

/**
 * Main logout function
 */
export const logout = async (userType = USER_TYPES.PUBLIC, options = {}) => {
  const {
    showLoader = false,
    redirect = true,
    redirectPath = '/',
    onSuccess = null,
    onError = null
  } = options;
  
  try {
    // Show loader if requested
    if (showLoader) {
      window.dispatchEvent(new CustomEvent('showLogoutLoader'));
    }
    
    // Call logout API (best effort)
    await callLogoutAPI(userType);
    
    // Clear authentication data
    clearAuthData(userType);
    
    // Dispatch logout event for other components to listen
    window.dispatchEvent(new CustomEvent('user:logout', {
      detail: { userType, timestamp: Date.now() }
    }));
    
    // Call success callback
    if (onSuccess) {
      onSuccess();
    }
    
    // Handle redirect
    if (redirect) {
      setTimeout(() => {
        if (showLoader) {
          window.dispatchEvent(new CustomEvent('hideLogoutLoader'));
        }
        
        // Use different redirect paths based on user type
        const finalRedirectPath = userType === USER_TYPES.PUBLIC 
          ? redirectPath 
          : '/login';
          
        window.location.href = finalRedirectPath;
      }, showLoader ? 1000 : 0);
    }
    
  } catch (error) {
    
    // Still clear data and redirect on error
    clearAuthData(userType);
    
    if (onError) {
      onError(error);
    }
    
    if (redirect) {
      const finalRedirectPath = userType === USER_TYPES.PUBLIC 
        ? redirectPath 
        : '/login';
      window.location.href = finalRedirectPath;
    }
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (userType = USER_TYPES.PUBLIC) => {
  const authKeys = AUTH_KEYS[userType];
  if (!authKeys) return false;
  
  const token = localStorage.getItem(authKeys.token);
  if (!token) return false;
  
  // Check if token is expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
};

/**
 * Get current user data
 */
export const getCurrentUser = (userType = USER_TYPES.PUBLIC) => {
  const authKeys = AUTH_KEYS[userType];
  if (!authKeys) return null;
  
  const userData = localStorage.getItem(authKeys.data);
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (error) {
    return null;
  }
};

/**
 * Get current token
 */
export const getCurrentToken = (userType = USER_TYPES.PUBLIC) => {
  const authKeys = AUTH_KEYS[userType];
  if (!authKeys) return null;
  
  return localStorage.getItem(authKeys.token);
};