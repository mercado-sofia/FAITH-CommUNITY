'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token is valid (not expired)
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }, []);

  // Initialize auth state from localStorage
  const initializeAuth = useCallback(() => {
    try {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      
      if (token && storedUserData && isTokenValid(token)) {
        const userData = JSON.parse(storedUserData);
        setUser(userData);
      } else {
        // Clear invalid data
        if (token || storedUserData) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear corrupted data
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isTokenValid]);

  // Login function
  const login = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem('userToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', 'user');
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
    document.cookie = 'userRole=user; path=/; max-age=86400';
    document.cookie = 'token=; path=/; max-age=86400';
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (token) {
        // Call logout API in background
        fetch('http://localhost:8080/api/users/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.warn('Logout API call failed, but continuing with client-side logout');
        });
      }

      // Clear all auth data
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      setUser(null);
      
      // Refresh page immediately
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear data and refresh
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user && !!localStorage.getItem('userToken');
  }, [user]);

  // Get current token
  const getToken = useCallback(() => {
    return localStorage.getItem('userToken');
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const value = {
    user,
    isLoading,
    isAuthenticated: isAuthenticated(),
    login,
    logout,
    getToken,
    isTokenValid
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
