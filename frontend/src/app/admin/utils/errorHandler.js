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

  // Handle Response objects
  if (error && typeof error.status === 'number') {
    const status = error.status;
    
    if (status === 401) {
      if (logError) {
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
      if (logError) {
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
      if (logError) {
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
      if (logError) {
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
      if (logError) {
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
    if (logError) {
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
    if (logError) {
      logger.apiError(context, new Error(error));
    }
    
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: error,
      action: 'show_error'
    };
  }
  
  // Default unknown error
  if (logError) {
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

