/**
 * Centralized Error Handler Utility
 * Provides consistent error handling across all admin pages
 */

import logger from '@/utils/logger';
import { clearAuthAndRedirect, showAuthError } from '@/utils/adminAuth';

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
 * @returns {object} Error information object
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
      if (logError && !error._alreadyLogged) {
        logger.apiError(context, new Error('Authentication failed'), { status });
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
    if (logError && !error._alreadyLogged) {
      logger.apiError(context, error);
    }
    
    // Check for authentication-related error messages
    if (error.message.includes('token') || 
        error.message.includes('session') || 
        error.message.includes('authentication') ||
        error.message.includes('expired')) {
      
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

/**
 * Create a standardized error handler for async operations
 * @param {Function} operation - The async operation to execute
 * @param {string} context - Context for error logging
 * @param {object} options - Error handling options
 * @returns {Promise} Promise that resolves with result or rejects with error info
 */
export const withErrorHandling = async (operation, context, options = {}) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const errorInfo = handleApiError(error, context, options);
    return { success: false, error: errorInfo };
  }
};

