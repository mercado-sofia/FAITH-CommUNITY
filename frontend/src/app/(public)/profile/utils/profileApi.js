// API configuration utility for profile components
import { authenticatedFetch } from '@/utils/shared/apiClient';

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
// Note: These are deprecated - use authenticatedFetch instead which handles cookies automatically
export const getAuthHeaders = () => {
  // This is now handled by authenticatedFetch with httpOnly cookies, but kept for compatibility
  return {
    'Content-Type': 'application/json'
    // No Authorization header needed - httpOnly cookies handle authentication
  };
};

export const getAuthHeadersWithFormData = () => {
  // This is now handled by authenticatedFetch with httpOnly cookies, but kept for compatibility
  return {
    // No Authorization header needed - httpOnly cookies handle authentication
    // Don't set Content-Type - browser will set it with boundary for FormData
  };
};