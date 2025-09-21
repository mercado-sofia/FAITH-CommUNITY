/**
 * Admin and Superadmin Authentication Utilities
 * Handles token validation, refresh attempts, and secure redirects for both admin and superadmin users
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Clear all authentication data and redirect to login
 */
export const clearAuthAndRedirect = (userType = 'admin') => {
  if (userType === 'admin') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
  } else if (userType === 'superadmin') {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminData');
    localStorage.removeItem('token');
  }
  
  localStorage.removeItem('userRole');
  document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/login';
};

/**
 * Check if token is expired (basic check without server validation)
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
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
    console.warn('Token is expired, redirecting to login');
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
    console.warn('Received 401 response, token may be invalid or expired');
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
    console.warn('Token is expired, redirecting to login');
    clearAuthAndRedirect(userType);
    return null;
  }
  
  // If we have user data, return it
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.warn('Invalid user data in localStorage');
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
    console.error('Error fetching user data:', error);
  }
  
  return null;
};

/**
 * Show user-friendly error message for authentication issues
 */
export const showAuthError = (message = 'Your session has expired. Please log in again.') => {
  // You can customize this to show a modal, toast, or other UI element
  alert(message);
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
