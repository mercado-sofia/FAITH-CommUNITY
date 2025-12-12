/**
 * Centralized Error Handler Utility
 * Provides consistent error handling across all admin pages
 */

import logger from '@/utils/shared/logger';
import { clearAuthAndRedirect, showAuthError } from '@/utils/shared/portalAuth';
import { getValidAccessToken, isRefreshTokenExpired } from '@/utils/shared/tokenRefresh';

/**
 * Error types
 */
export const ERROR_TYPES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

/**
 * Handle API errors consistently
 * @param {Error|Response} error - The error object or response
 * @param {string} context - Context where error occurred
 * @param {object} options - Additional options
 * @returns {object|Promise<object>} Error information object (Promise for 401 errors)
 */
export const handleApiError = (error, context = 'api_call', options = {}) => {
  const {
    showToast = true,
    redirectOnAuth = true,
    logError = true
  } = options;

  // Skip logging if error is already logged
  if (error?._alreadyLogged) {
    logError = false;
  }

  // Handle Response objects
  if (error && typeof error.status === 'number') {
    const status = error.status;
    
    if (status === 401) {
      // For 401 errors, attempt silent token refresh before showing error
      // Return a Promise that resolves after refresh attempt
      return (async () => {
        try {
          // Silently attempt to refresh token
          const refreshed = await getValidAccessToken(true, true); // Force refresh, silent mode
          
          if (refreshed) {
            // Token refresh succeeded - access token was expired but refresh token is valid
            // Don't show error, return success indicator so caller can retry
            return {
              type: ERROR_TYPES.AUTHENTICATION,
              message: 'Token refreshed successfully',
              action: 'retry_request', // Indicate that request should be retried
              status,
              refreshed: true
            };
          } else {
            // Refresh failed - check if refresh token is expired
            const refreshTokenExpired = await isRefreshTokenExpired();
            
            if (refreshTokenExpired) {
              // Refresh token is expired (after 7 days) - show error and redirect
              if (logError && !error._alreadyLogged) {
                logger.apiError(context, new Error('Authentication failed - refresh token expired'), { status });
              }
              
              if (redirectOnAuth) {
                showAuthError('Your session has expired. Please log in again.');
                clearAuthAndRedirect('admin');
              }
              
              return {
                type: ERROR_TYPES.AUTHENTICATION,
                message: 'Your session has expired. Please log in again.',
                action: 'redirect_to_login',
                status
              };
            } else {
              // Access token expired but refresh token is still valid
              // This shouldn't happen if refresh succeeded, but handle gracefully
              // Return retry indicator
              return {
                type: ERROR_TYPES.AUTHENTICATION,
                message: 'Token refresh in progress',
                action: 'retry_request',
                status,
                refreshed: false
              };
            }
          }
        } catch (refreshError) {
          // Error during refresh attempt - assume refresh token is expired
          if (logError && !error._alreadyLogged) {
            logger.apiError(context, new Error('Authentication failed - refresh error'), { status, refreshError });
          }
          
          if (redirectOnAuth) {
            showAuthError('Your session has expired. Please log in again.');
            clearAuthAndRedirect('admin');
          }
          
          return {
            type: ERROR_TYPES.AUTHENTICATION,
            message: 'Your session has expired. Please log in again.',
            action: 'redirect_to_login',
            status
          };
        }
      })();
    }
    
    if (status === 403) {
      if (logError && !error._alreadyLogged) {
        logger.apiError(context, new Error('Access denied'), { status });
      }
      
      return {
        type: ERROR_TYPES.AUTHORIZATION,
        message: 'You do not have permission to perform this action.',
        action: 'show_error',
        status
      };
    }
    
    if (status === 404) {
      if (logError && !error._alreadyLogged) {
        logger.apiError(context, new Error('Resource not found'), { status });
      }
      
      return {
        type: ERROR_TYPES.NETWORK,
        message: 'The requested resource was not found.',
        action: 'show_error',
        status
      };
    }
    
    if (status === 429) {
      if (logError && !error._alreadyLogged) {
        logger.apiError(context, new Error('Rate limit exceeded'), { status });
      }
      
      return {
        type: ERROR_TYPES.NETWORK,
        message: 'Too many requests. Please wait a moment and try again.',
        action: 'show_error',
        status
      };
    }
    
    if (status >= 500) {
      if (logError && !error._alreadyLogged) {
        logger.apiError(context, new Error('Server error'), { status });
      }
      
      return {
        type: ERROR_TYPES.SERVER,
        message: 'Server error. Please try again later.',
        action: 'show_error',
        status
      };
    }
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Check for authentication-related error messages
    const isAuthError = error.message.includes('token') || 
        error.message.includes('session') || 
        error.message.includes('authentication') ||
        error.message.includes('expired');
    
    if (isAuthError) {
      // For auth errors, attempt silent token refresh before showing error
      // Return a Promise that resolves after refresh attempt
      return (async () => {
        try {
          // Silently attempt to refresh token
          const refreshed = await getValidAccessToken(true, true); // Force refresh, silent mode
          
          if (refreshed) {
            // Token refresh succeeded - don't show error
            return {
              type: ERROR_TYPES.AUTHENTICATION,
              message: 'Token refreshed successfully',
              action: 'retry_request', // Indicate that request should be retried
              refreshed: true
            };
          } else {
            // Refresh failed - check if refresh token is expired
            const refreshTokenExpired = await isRefreshTokenExpired();
            
            if (refreshTokenExpired) {
              // Refresh token is expired (after 7 days) - show error and redirect
              if (logError && !error._alreadyLogged) {
                logger.apiError(context, error);
              }
              
              if (redirectOnAuth) {
                showAuthError('Your session has expired. Please log in again.');
                clearAuthAndRedirect('admin');
              }
              
              return {
                type: ERROR_TYPES.AUTHENTICATION,
                message: 'Your session has expired. Please log in again.',
                action: 'redirect_to_login'
              };
            } else {
              // Access token expired but refresh token is still valid
              // Return retry indicator
              return {
                type: ERROR_TYPES.AUTHENTICATION,
                message: 'Token refresh in progress',
                action: 'retry_request',
                refreshed: false
              };
            }
          }
        } catch (refreshError) {
          // Error during refresh attempt - assume refresh token is expired
          if (logError && !error._alreadyLogged) {
            logger.apiError(context, error);
          }
          
          if (redirectOnAuth) {
            showAuthError('Your session has expired. Please log in again.');
            clearAuthAndRedirect('admin');
          }
          
          return {
            type: ERROR_TYPES.AUTHENTICATION,
            message: 'Your session has expired. Please log in again.',
            action: 'redirect_to_login'
          };
        }
      })();
    }
    
    // Non-auth errors - log normally
    if (logError && !error._alreadyLogged) {
      logger.apiError(context, error);
    }
    
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: error.message || 'An unexpected error occurred. Please try again.',
      action: 'show_error'
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    if (logError && !error._alreadyLogged) {
      logger.apiError(context, new Error(error));
    }
    
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: error,
      action: 'show_error'
    };
  }
  
  // Default unknown error
  if (logError && !error?._alreadyLogged) {
    logger.apiError(context, new Error('Unknown error'), { error });
  }
  
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.',
    action: 'show_error'
  };
};

/**
 * Handle form validation errors
 * @param {object} errors - Validation errors object
 * @returns {object} Formatted error information
 */
export const handleValidationError = (errors) => {
  const errorMessages = Object.values(errors).filter(Boolean);
  
  return {
    type: ERROR_TYPES.VALIDATION,
    message: errorMessages.length > 0 
      ? errorMessages.join(', ')
      : 'Please fix the validation errors before submitting.',
    action: 'show_error',
    errors
  };
};

/**
 * Extract error message from RTK Query error object
 * @param {object} error - RTK Query error object
 * @returns {string} Extracted error message
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle network errors (Failed to fetch, CORS, etc.)
  const errorMessage = error.message || error.error || (typeof error === 'string' ? error : '');
  const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';
  
  // Check for network-related errors
  if (errorString.includes('failed to fetch') || 
      errorString.includes('networkerror') ||
      errorString.includes('network request failed') ||
      errorString.includes('fetch failed') ||
      errorString.includes('cors') ||
      errorString.includes('connection refused') ||
      errorString.includes('err_network') ||
      errorString.includes('err_connection_refused')) {
    return 'Failed to fetch data. Please check your internet connection and ensure the API server is running. If the problem persists, contact support.';
  }

  // Handle RTK Query error structure
  if (error.data) {
    // Check for nested message/error in data
    if (typeof error.data === 'string') {
      return error.data;
    }
    if (error.data.message) {
      return error.data.message;
    }
    if (error.data.error) {
      return error.data.error;
    }
    if (error.data.details) {
      return error.data.details;
    }
  }

  // Handle error.error property
  if (error.error) {
    // Check if it's a network error
    const errorError = typeof error.error === 'string' ? error.error.toLowerCase() : '';
    if (errorError.includes('failed to fetch') || 
        errorError.includes('networkerror') ||
        errorError.includes('network request failed')) {
      return 'Failed to fetch data. Please check your internet connection and ensure the API server is running. If the problem persists, contact support.';
    }
    return error.error;
  }

  // Handle Error instance
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('failed to fetch') || 
        msg.includes('networkerror') ||
        msg.includes('network request failed')) {
      return 'Failed to fetch data. Please check your internet connection and ensure the API server is running. If the problem persists, contact support.';
    }
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    const msg = error.toLowerCase();
    if (msg.includes('failed to fetch') || 
        msg.includes('networkerror') ||
        msg.includes('network request failed')) {
      return 'Failed to fetch data. Please check your internet connection and ensure the API server is running. If the problem persists, contact support.';
    }
    return error;
  }

  // Handle status-based errors
  if (error.status) {
    // RTK Query network error statuses
    if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR' || error.status === 'CUSTOM_ERROR') {
      // Check the error message for network issues
      const statusError = error.error || error.data || error.message || '';
      const statusErrorStr = typeof statusError === 'string' ? statusError.toLowerCase() : '';
      
      if (statusErrorStr.includes('failed to fetch') || 
          statusErrorStr.includes('networkerror') ||
          statusErrorStr.includes('network request failed') ||
          statusErrorStr.includes('cors') ||
          statusErrorStr.includes('connection refused')) {
        return 'Failed to fetch data. Please check your internet connection and ensure the API server is running. If the problem persists, contact support.';
      }
      
      // Return the error message if available
      if (typeof statusError === 'string') {
        return statusError;
      }
      
      return 'Failed to fetch data. Please check your internet connection and ensure the API server is running.';
    }
    
    // HTTP status codes
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return `Error ${error.status}: ${error.statusText || 'An error occurred'}`;
  }

  // Fallback for unknown error structure
  try {
    return JSON.stringify(error);
  } catch {
    return 'An unexpected error occurred. Please try again.';
  }
};

