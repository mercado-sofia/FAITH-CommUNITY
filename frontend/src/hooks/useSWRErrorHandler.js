import { useCallback, useEffect } from 'react';
import logger from '../utils/logger';

/**
 * Custom hook for handling SWR errors with retry logic and user feedback
 * @param {Object} swrResult - The result from an SWR hook
 * @param {string} context - Context for error logging
 * @param {Function} onError - Optional callback for error handling
 * @param {Function} onRetry - Optional callback for retry logic
 */
export const useSWRErrorHandler = (swrResult, context = '', onError = null, onRetry = null) => {
  const { error, isLoading, mutate } = swrResult;

  const handleError = useCallback((err) => {
    logger.error(`SWR Error in ${context}`, err, { context });
    
    if (onError) {
      onError(err);
    }
  }, [context, onError]);

  const handleRetry = useCallback(async () => {
    try {
      logger.info(`Retrying SWR request for ${context}`);
      await mutate();
      
      if (onRetry) {
        onRetry();
      }
    } catch (err) {
      logger.error(`Retry failed for ${context}`, err, { context });
    }
  }, [context, mutate, onRetry]);

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  return {
    error,
    isLoading,
    retry: handleRetry,
    hasError: !!error
  };
};

/**
 * Hook for handling authentication errors specifically
 * @param {Object} swrResult - The result from an SWR hook
 * @param {Function} onAuthError - Callback for authentication errors
 */
export const useAuthErrorHandler = (swrResult, onAuthError) => {
  const { error, isLoading, mutate } = swrResult;

  const handleAuthError = useCallback((err) => {
    if (err.message?.includes('token') || err.message?.includes('auth') || err.status === 401) {
      logger.warn('Authentication error detected', { error: err.message });
      if (onAuthError) {
        onAuthError(err);
      }
    }
  }, [onAuthError]);

  useEffect(() => {
    if (error) {
      handleAuthError(error);
    }
  }, [error, handleAuthError]);

  return {
    error,
    isLoading,
    retry: mutate,
    isAuthError: error?.message?.includes('token') || error?.message?.includes('auth') || error?.status === 401
  };
};

/**
 * Hook for handling network errors with offline detection
 * @param {Object} swrResult - The result from an SWR hook
 * @param {Function} onNetworkError - Callback for network errors
 */
export const useNetworkErrorHandler = (swrResult, onNetworkError) => {
  const { error, isLoading, mutate } = swrResult;

  const handleNetworkError = useCallback((err) => {
    if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('network')) {
      logger.warn('Network error detected', { error: err.message, online: navigator.onLine });
      if (onNetworkError) {
        onNetworkError(err);
      }
    }
  }, [onNetworkError]);

  useEffect(() => {
    if (error) {
      handleNetworkError(error);
    }
  }, [error, handleNetworkError]);

  return {
    error,
    isLoading,
    retry: mutate,
    isNetworkError: !navigator.onLine || error?.message?.includes('fetch') || error?.message?.includes('network')
  };
};
