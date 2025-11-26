import { useState, useEffect, useCallback } from 'react';
import { logout as authServiceLogout, USER_TYPES } from '@/utils/shared/authService';
import { getValidAccessToken } from '@/utils/shared/tokenRefresh';

export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state - check auth via backend API (reads from httpOnly cookie)
  const initializeAuth = useCallback(async () => {
    try {
      // Check for window to avoid SSR errors
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }
      
      // Check authentication status from backend (reads from httpOnly cookie)
      const { getCurrentUser } = await import('@/utils/shared/authService');
      const userData = await getCurrentUser();
      
      if (userData) {
        // Only set user if they are a regular user (not admin/superadmin)
        // Admin/superadmin should be redirected by the public layout
        const userRole = userData.role?.toLowerCase();
        if (userRole === 'admin' || userRole === 'superadmin') {
          // Admin/superadmin detected - don't set user state
          // The public layout will redirect them
          setUser(null);
        } else {
          // Regular user - store and set user data
          localStorage.setItem('userData', JSON.stringify(userData));
          setUser(userData);
        }
      } else {
        // Not authenticated - clear any stale data
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData && storedUserData !== 'undefined' && storedUserData !== 'null') {
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
        }
        setUser(null);
      }
    } catch (error) {
      // Clear corrupted data using centralized cleanup
      const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
      clearAuthImmediate(USER_TYPES.PUBLIC);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!user; // User data is set from backend auth check
  }, [user]);

  // Get current token - tokens are in httpOnly cookies, not accessible to JS
  const getToken = useCallback(() => {
    // Tokens are in httpOnly cookies - return null as they're not accessible to JavaScript
    // This is intentional for security (XSS protection)
    return null;
  }, []);

  // Logout function - now uses centralized auth service
  const logout = useCallback(async (options = {}) => {
    await authServiceLogout(USER_TYPES.PUBLIC, {
      showLoader: true,
      redirect: true,
      redirectPath: '/',
      ...options
    });
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    user,
    isLoading,
    isAuthenticated: isAuthenticated(),
    logout,
    getToken
  };
};