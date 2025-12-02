/**
 * Centralized API Client for Superadmin Portal
 * Wraps makeAuthenticatedRequest with superadmin-specific features:
 * - Automatic token refresh on 401 errors
 * - Configurable timeouts
 * - Router support for redirects
 * - Enhanced error handling
 */

import { makeAuthenticatedRequest } from '@/utils/shared/portalAuth';
import { clearAuthImmediate, USER_TYPES } from '@/utils/shared/authService';
import { logError } from '@/config/api';

/**
 * Make authenticated API request for superadmin with automatic token refresh
 * @param {string} url - API endpoint (full URL or relative path)
 * @param {RequestInit} options - Fetch options
 * @param {object} router - Next.js router instance (optional, for redirects)
 * @param {object} config - Additional configuration
 * @param {number} config.timeout - Request timeout in milliseconds (default: 30000, 60000 for approvals)
 * @returns {Promise<Response|null>} - Fetch response or null if redirect occurred
 */
export const makeSuperadminRequest = async (url, options = {}, router = null, config = {}) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make authenticated request on server side');
  }

  // Determine timeout - longer for approvals requests that may contain large data
  const isApprovalsRequest = url && url.includes('/api/approvals');
  const timeoutMs = config.timeout || (isApprovalsRequest ? 60000 : 30000);
  const abortController = new AbortController();
  let timeoutId = null;

  try {
    // Set timeout
    timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    // Merge abort signal with existing signal if provided
    const signal = options.signal 
      ? AbortSignal.any([abortController.signal, options.signal])
      : abortController.signal;

    // Prepare headers - don't set Content-Type for FormData (browser sets it with boundary)
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
      ? { ...options.headers } // No Content-Type for FormData
      : {
          'Content-Type': 'application/json',
          ...options.headers
        };

    // Use the centralized makeAuthenticatedRequest which handles token refresh
    const response = await makeAuthenticatedRequest(url, {
      ...options,
      signal,
      credentials: 'include', // CRITICAL: Include httpOnly cookies
      headers
    }, 'superadmin');

    clearTimeout(timeoutId);

    // If makeAuthenticatedRequest returned null, it means redirect occurred
    if (response === null) {
      return null;
    }

    // Check if response is JSON before parsing (only if content-type header exists)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw new Error('Server returned an invalid response. Please try again.');
    }

    // Handle different HTTP status codes
    if (response.status === 401) {
      // This should not happen if token refresh worked, but handle it anyway
      clearAuthImmediate(USER_TYPES.SUPERADMIN);
      if (router) {
        router.push('/login');
      } else {
        window.location.href = '/login';
      }
      return null;
    } else if (response.status === 403) {
      // Forbidden - user doesn't have permission
      throw new Error('You do not have permission to perform this action.');
    } else if (response.status === 404) {
      // Not found
      throw new Error('The requested resource was not found.');
    } else if (response.status >= 500 || response.status === 503) {
      // Server error - try to get detailed error message from response
      let errorMessage = 'Server error. Please try again later.';
      let errorType = 'UNKNOWN_ERROR';
      
      try {
        // Try to parse error response to get specific error type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // Clone response before reading to avoid consuming the body
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          if (errorData.errorType) {
            errorType = errorData.errorType;
          }
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } catch (parseError) {
        // If parsing fails, use default message
        logError(parseError, { context: 'makeSuperadminRequest-parseError' });
      }
      
      // Create error object with type information
      const error = new Error(errorMessage);
      error.errorType = errorType;
      throw error;
    } else if (!response.ok) {
      // Other client errors (400-499) - try to get detailed error message
      let errorMessage = `Request failed with status ${response.status}. Please try again.`;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // Clone response before reading to avoid consuming the body
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } catch (parseError) {
        // If parsing fails, use default message
        logError(parseError, { context: 'makeSuperadminRequest-parseError' });
      }
      
      throw new Error(errorMessage);
    }

    return response;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    // Handle timeout/abort errors
    if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
      const timeoutError = new Error('Request timed out. The server is taking too long to respond. This may happen when loading approvals with large data (post-act reports, images). Please try again.');
      timeoutError.status = 408; // Request Timeout
      timeoutError.isTimeout = true;
      logError(timeoutError, { context: 'makeSuperadminRequest-timeout', url, timeoutMs });
      throw timeoutError;
    }
    
    // Re-throw other errors
    throw fetchError;
  }
};

