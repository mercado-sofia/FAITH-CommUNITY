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
      
      // If logout is in progress, check auth status directly (bypassing getCurrentUser's logoutInProgress check)
      // to confirm cookies are actually cleared before clearing the flag
      if (logoutInProgress === 'true') {
        // Make direct API call to check auth status (bypasses getCurrentUser's logoutInProgress check)
        const { API_BASE_URL } = await import('@/config/api');
        const authCheckUrl = API_BASE_URL ? `${API_BASE_URL}/api/users/auth/check` : '/api/users/auth/check';
        
        try {
          const response = await fetch(authCheckUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          
          let userData = null;
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user) {
              userData = data.user;
            }
          }
          
          // If userData exists, logout failed - cookies still present, keep flag and clear data
          if (userData) {
            const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
            clearAuthImmediate(USER_TYPES.PUBLIC);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // If userData is null, logout is confirmed - clear flag and set user to null
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('logoutInProgress');
          }
          setUser(null);
          setIsLoading(false);
          return;
        } catch (error) {
          // On error, assume logout failed and keep flag set
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/shared/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      
      // Normal auth check when logout is not in progress
      const { getCurrentUser } = await import('@/utils/shared/authService');
      const userData = await getCurrentUser();
      
      // Legacy code path - should not be reached when logoutInProgress is set
      if (logoutInProgress === 'true' && userData) {
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