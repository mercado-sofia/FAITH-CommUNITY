// API configuration utility for profile components
import { authenticatedFetch } from '@/utils/apiClient';

export const getApiUrl = (endpoint) => {
  return endpoint; // authenticatedFetch handles full URL construction
};

/**
 * Make authenticated API request with automatic token refresh
 * @param {string} endpoint - API endpoint (relative path)
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  return authenticatedFetch(endpoint, options, 'user');
};

// Legacy functions for backward compatibility
export const getAuthHeaders = () => {
  // This is now handled by authenticatedFetch, but kept for compatibility
  const token = localStorage.getItem('userToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getAuthHeadersWithFormData = () => {
  // This is now handled by authenticatedFetch, but kept for compatibility
  const token = localStorage.getItem('userToken');
  return {
    'Authorization': `Bearer ${token}`
  };
};