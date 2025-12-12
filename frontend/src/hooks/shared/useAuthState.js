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
      
      // Check if logout is in progress - prevent race condition
      const logoutInProgress = sessionStorage.getItem('logoutInProgress');
      
      // Check authentication status from backend (reads from httpOnly cookie)
      // getCurrentUser() will return null if logoutInProgress is set
      const { getCurrentUser } = await import('@/utils/shared/authService');
      const userData = await getCurrentUser();
      
      // Only clear logout flag after confirming user is actually logged out
      // This ensures the flag persists until logout is fully complete
      if (logoutInProgress === 'true' && !userData) {
        // Logout is complete - user is confirmed logged out
        // Clear the flag now that we've confirmed logout
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('logoutInProgress');
        }
      } else if (logoutInProgress === 'true' && userData) {
        // Logout flag is set but user data was returned - this shouldn't happen
        // but if it does, clear stale data and keep flag to prevent re-auth
        const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
        clearAuthImmediate(USER_TYPES.PUBLIC);
        setUser(null);
        setIsLoading(false);
        return;
      }
      
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
      // Clear logout flag on error as well
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('logoutInProgress');
      }
      
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

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for logout event to immediately clear user state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLogout = async () => {
      // Immediately clear user state when logout event is received
      setUser(null);
      // Clear any stale localStorage data
      const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
      clearAuthImmediate(USER_TYPES.PUBLIC);
    };

    window.addEventListener('user:logout', handleLogout);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('user:logout', handleLogout);
      }
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: isAuthenticated()
  };
};