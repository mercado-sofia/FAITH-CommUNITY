/**
 * Centralized Authentication Service
 * Handles all authentication operations including logout for all user types
 */

import { API_BASE_URL } from '@/config/api';

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
  },
  [USER_TYPES.ADMIN]: {
    token: 'adminToken',
    data: 'adminData',
  },
  [USER_TYPES.SUPERADMIN]: {
    token: 'superAdminToken',
    data: 'superAdminData',
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
  // Check for window and document to avoid SSR errors
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const authKeys = AUTH_KEYS[userType];
  
  // Clear user-specific data
  if (authKeys) {
    localStorage.removeItem(authKeys.token);
    localStorage.removeItem(authKeys.data);
  }
  
  // Clear common keys
  COMMON_KEYS.forEach(key => localStorage.removeItem(key));
  
  // Clear cookies (userRole can be cleared client-side)
  // Note: httpOnly cookies (access_token, refresh_token) can only be cleared by backend
  document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

/**
 * Immediate authentication cleanup for system-level failures
 * No delays, no events, no redirects - just secure cleanup
 */
export const clearAuthImmediate = (userType = USER_TYPES.PUBLIC) => {
  // Check for window and document to avoid SSR errors
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

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
 * Main logout function - works for all roles (user, admin, superadmin)
 */
export const logout = async (userType = USER_TYPES.PUBLIC, options = {}) => {
  const {
    showLoader = false,
    redirect = true,
    redirectPath = '/',
    onSuccess = null,
    onError = null
  } = options;
  
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Set logout flag in sessionStorage to prevent race condition
    // This flag will be checked by useAuthState to prevent re-authentication
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('logoutInProgress', 'true');
    }
    
    // Show loader if requested
    if (showLoader && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('showLogoutLoader'));
    }
    
    // Clear authentication data from localStorage immediately (synchronous)
    // This prevents any components from reading stale data
    clearAuthData(userType);
    
    // Dispatch logout event immediately to clear state in components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user:logout', {
        detail: { userType, timestamp: Date.now() }
      }));
    }
    
    // Call logout API to clear httpOnly cookies (works for all roles now!)
    // Do this after clearing local state to ensure UI updates immediately
    try {
      // Use unified logout endpoint - works for all roles
      const logoutUrl = API_BASE_URL ? `${API_BASE_URL}/api/users/logout` : '/api/users/logout';
      const response = await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include', // Include cookies to clear them
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Wait for the response to ensure logout is processed on backend
      if (!response.ok) {
        console.warn('[logout] Logout API returned non-OK status:', response.status);
      }
    } catch (error) {
      // Continue with redirect even if logout endpoint fails
      // Local state is already cleared
      console.error('[logout] Error calling logout API:', error);
    }
    
    // Call success callback
    if (onSuccess) {
      onSuccess();
    }
    
    // Handle redirect - ensure logout API completes first
    if (redirect) {
      // Small delay to ensure all cleanup is complete
      const redirectDelay = showLoader ? 1000 : 100;
      
      setTimeout(() => {
        if (showLoader && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hideLogoutLoader'));
        }
        
        // Use different redirect paths based on user type
        const finalRedirectPath = userType === USER_TYPES.PUBLIC 
          ? redirectPath 
          : '/login';
          
        if (typeof window !== 'undefined') {
          // Clear logout flag just before redirect
          // It will be cleared on the new page load if it still exists
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('logoutInProgress');
          }
          window.location.href = finalRedirectPath;
        }
      }, redirectDelay);
    } else {
      // If not redirecting, clear the logout flag
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('logoutInProgress');
      }
    }
    
  } catch (error) {
    console.error('[logout] Error during logout:', error);
    
    // Still clear data and redirect on error
    clearAuthData(userType);
    
    // Clear logout flag on error
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('logoutInProgress');
    }
    
    if (onError) {
      onError(error);
    }
    
    if (redirect) {
      const finalRedirectPath = userType === USER_TYPES.PUBLIC 
        ? redirectPath 
        : '/login';
      if (typeof window !== 'undefined') {
        window.location.href = finalRedirectPath;
      }
    }
  }
};

/**
 * Check if user is authenticated by calling backend
 * This verifies the httpOnly cookie server-side (secure!)
 */
export const isAuthenticated = async (userType = USER_TYPES.PUBLIC) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/auth/check`, {
      method: 'GET',
      credentials: 'include', // CRITICAL: Include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return false;
  
    const data = await response.json();
    
    if (data.authenticated && data.needsRefresh) {
      // Try to refresh token
      const { getValidAccessToken } = await import('./tokenRefresh');
      await getValidAccessToken(true);
      // Retry check
      const retryResponse = await fetch(`${API_BASE_URL}/api/users/auth/check`, {
        method: 'GET',
        credentials: 'include',
      });
      const retryData = await retryResponse.json();
      return retryData.authenticated === true;
    }
    
    return data.authenticated === true;
  } catch (error) {
    return false;
  }
};

/**
 * Get current user data from backend (reads from httpOnly cookie)
 */
export const getCurrentUser = async (userType = USER_TYPES.PUBLIC) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') return null;
  
  try {
    // Build URL - use relative path if API_BASE_URL is empty (rewrites enabled)
    const authCheckUrl = API_BASE_URL ? `${API_BASE_URL}/api/users/auth/check` : '/api/users/auth/check';
    
    const response = await fetch(authCheckUrl, {
      method: 'GET',
      credentials: 'include', // CRITICAL: Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control to prevent stale responses
      cache: 'no-store',
    });

    if (!response.ok) {
      // If we get a 401, it might mean cookies aren't available yet (race condition)
      // Return null and let the caller retry
      if (response.status === 401) {
        console.warn('[getCurrentUser] 401 Unauthorized - cookies may not be available yet');
      } else {
        console.error('[getCurrentUser] Auth check failed:', response.status, response.statusText);
      }
      return null;
    }

    const data = await response.json();
    
    // If authenticated, return user data
    if (data.authenticated && data.user) {
      return data.user;
    }
    
    // If not authenticated but can refresh, try refreshing
    if (data.needsRefresh) {
      const { refreshAccessToken } = await import('@/utils/shared/tokenRefresh');
      const refreshed = await refreshAccessToken();
      
      if (refreshed) {
        // Retry the auth check after refresh - use same URL building logic
        const retryUrl = API_BASE_URL ? `${API_BASE_URL}/api/users/auth/check` : '/api/users/auth/check';
        const retryResponse = await fetch(retryUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.authenticated && retryData.user) {
            return retryData.user;
          }
        }
      } else {
        console.warn('[getCurrentUser] Token refresh failed');
      }
    }
    
    return null;
  } catch (error) {
    console.error('[getCurrentUser] Error checking auth status:', error);
    // Don't throw - return null to allow retry
    return null;
  }
};

/**
 * Get current token
 * Note: Tokens are now in httpOnly cookies and not accessible to JavaScript
 * This function is kept for backward compatibility but returns null
 */
export const getCurrentToken = (userType = USER_TYPES.PUBLIC) => {
  // Tokens are in httpOnly cookies - not accessible to JavaScript (by design for security)
  return null;
};