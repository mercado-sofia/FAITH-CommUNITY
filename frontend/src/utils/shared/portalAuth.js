/**
 * Portal Authentication Utilities (Admin & Superadmin)
 * Handles token validation, refresh attempts, and secure redirects for both admin and superadmin users
 */

import { clearAuthImmediate, USER_TYPES } from './authService';
import { API_BASE_URL } from '@/config/api';
import {
  assertNotDemoMutation,
  getActiveDemoUser,
  isPortalDemoActive,
} from '@/config/portalDemo';
import { fetchPortalWithFallback } from './fetchPortalWithFallback';

/**
 * Clear all authentication data and redirect to login
 * Now uses centralized cleanup for security
 */
export const clearAuthAndRedirect = (userType = 'admin') => {
  // Use centralized immediate cleanup for security
  const userTypeEnum = userType === 'admin' ? USER_TYPES.ADMIN : USER_TYPES.SUPERADMIN;
  clearAuthImmediate(userTypeEnum);
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

/**
 * Check if token is expired (basic check without server validation)
 * Note: Hardcoded tokens are never "expired" - let the backend handle validation
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  // Handle hardcoded superadmin token
  // Don't reject it here - let the backend handle it
  // The backend will reject it in production, and we'll handle that via 403 response
  if (token === "superadmin") {
    return false; // Never consider hardcoded tokens as expired - backend will validate
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
 * Tokens are now in httpOnly cookies, so they're sent automatically
 */
export const makeAuthenticatedRequest = async (url, options = {}, userType = 'admin') => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make authenticated request on server side');
  }

  const method = (options.method || 'GET').toUpperCase();

  if (isPortalDemoActive()) {
    assertNotDemoMutation(method);
    if (method === 'GET') {
      const data = await fetchPortalWithFallback(url, { ...options, method });
      return new Response(JSON.stringify(data ?? {}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Prepare headers - don't set Content-Type for FormData (browser sets it with boundary)
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...options.headers } // No Content-Type for FormData - browser will set it with boundary
    : {
        'Content-Type': 'application/json',
        ...options.headers
      };

  // Make the request - tokens are in httpOnly cookies, sent automatically
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // CRITICAL: Include httpOnly cookies
    headers
    // REMOVED: 'Authorization' header - cookies handle this now
  });
  
  // Handle 401/403 responses - try refresh if possible
  if (response.status === 401 || response.status === 403) {
    // Check if it's a hardcoded token rejection
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.clone().json();
        if (errorData.error && errorData.error.includes('Hardcoded token not allowed in production')) {
          // Backend rejected hardcoded token in production - clear auth and redirect
          clearAuthAndRedirect(userType);
          return null;
        }
      }
    } catch (e) {
      // If we can't parse the error, just treat it as a normal auth error
      console.warn('[makeAuthenticatedRequest] Could not parse error response:', e);
    }
    
    // Try to refresh token (works for all roles now!)
    try {
      const { getValidAccessToken } = await import('./tokenRefresh');
      const refreshed = await getValidAccessToken(true);
      if (refreshed) {
        // Retry request - new token is in cookie
        // Use same header logic as initial request (preserve FormData handling)
        const retryHeaders = isFormData
          ? { ...options.headers }
          : {
              'Content-Type': 'application/json',
              ...options.headers
            };
        
        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: retryHeaders
        });
        
        // Check if retry also failed
        if (retryResponse.status === 401 || retryResponse.status === 403) {
          clearAuthAndRedirect(userType);
          return null;
        }
        
        return retryResponse;
      }
    } catch (refreshError) {
      // Refresh failed
      console.error('[makeAuthenticatedRequest] Token refresh failed:', refreshError);
    }
    
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // For non-2xx responses, try to get error message but don't fail if not JSON
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // It's JSON, return as-is for caller to handle
      return response;
    } else {
      // Not JSON - create a proper error response
      console.error('[makeAuthenticatedRequest] Non-JSON error response:', {
        status: response.status,
        statusText: response.statusText,
        url,
        contentType
      });
      // Return response anyway - let caller handle it
      return response;
    }
  }
  
  return response;
};

/**
 * Validate token and get user data (now uses httpOnly cookies)
 */
export const validateTokenAndGetUser = async (userType = 'admin') => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') return null;
  
  const dataKey = userType === 'admin' ? 'adminData' : 'superAdminData';
  
  // Check auth status from backend (reads from httpOnly cookie)
  try {
    const { getCurrentUser } = await import('./authService');
    const userData = await getCurrentUser();
    
    if (!userData || (userType === 'admin' && userData.role !== 'admin') || 
        (userType === 'superadmin' && userData.role !== 'superadmin')) {
    clearAuthAndRedirect(userType);
    return null;
  }
  
    // Store user data in localStorage for quick access (non-sensitive data only)
    if (userData) {
      localStorage.setItem(dataKey, JSON.stringify(userData));
    }
    
    return userData;
  } catch (error) {
    clearAuthAndRedirect(userType);
    return null;
  }
};

/**
 * Show user-friendly error message for authentication issues
 */
export const showAuthError = (message = 'Your session has expired. Please log in again.') => {
  // You can customize this to show a modal, toast, or other UI element
  // For now, using a more user-friendly approach
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null; // Return cleanup function for consistency
  }
  
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
  
  // Auto-remove after 5 seconds with cleanup support
  const timeoutId = setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
  
  // Return cleanup function for manual cleanup if needed
  return () => {
    clearTimeout(timeoutId);
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  };
};

/**
 * Check authentication status on page load (now uses httpOnly cookies)
 */
export const checkAuthStatus = async (userType = 'admin') => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') return false;

  if (isPortalDemoActive()) {
    const demoUser = getActiveDemoUser();
    if (!demoUser) return false;
    if (userType === 'admin') return demoUser.role === 'admin';
    if (userType === 'superadmin') return demoUser.role === 'superadmin';
    return false;
  }
  
  try {
    // Check auth status from backend (reads from httpOnly cookie)
    const { isAuthenticated, USER_TYPES } = await import('./authService');
    const userTypeEnum = userType === 'admin' ? USER_TYPES.ADMIN : USER_TYPES.SUPERADMIN;
    const authenticated = await isAuthenticated(userTypeEnum);
  
    if (!authenticated) {
    clearAuthAndRedirect(userType);
    return false;
  }
  
  return true;
  } catch (error) {
    clearAuthAndRedirect(userType);
    return false;
  }
};

