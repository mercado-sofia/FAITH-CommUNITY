import { useState, useEffect, useCallback } from 'react';
import { logout as authServiceLogout, USER_TYPES } from '@/utils/authService';

export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token is valid (not expired)
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  }, []);

  // Initialize auth state from localStorage
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      
      // Only proceed if we have both token and userData, and token is valid
      if (token && storedUserData && storedUserData !== 'undefined' && storedUserData !== 'null' && isTokenValid(token)) {
        const userData = JSON.parse(storedUserData);
        setUser(userData);
      } else {
        // Clear invalid data only if we have user-related data
        if (token || (storedUserData && storedUserData !== 'undefined' && storedUserData !== 'null')) {
          // Use centralized immediate cleanup for security
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
        }
        setUser(null);
      }
    } catch (error) {
      // Clear corrupted data using centralized cleanup
      const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
      clearAuthImmediate(USER_TYPES.PUBLIC);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isTokenValid]);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user && !!localStorage.getItem('userToken');
  }, [user]);

  // Get current token
  const getToken = useCallback(() => {
    return localStorage.getItem('userToken');
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
    getToken,
    isTokenValid
  };
};