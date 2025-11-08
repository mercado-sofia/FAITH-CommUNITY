import { SWRConfig } from 'swr';
import logger from '../../../utils/logger';

// Global SWR configuration
export const swrConfig = {
  // Fetcher function with improved error handling
  fetcher: async (url) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error._alreadyLogged = true; // Mark as already logged
        logger.apiError(url, error, { status: response.status });
        throw error;
      }

      // Parse JSON with error handling
      try {
        return await response.json();
      } catch (parseError) {
        const error = new Error('Invalid JSON response from server');
        error.originalError = parseError;
        error._alreadyLogged = true; // Mark as already logged
        logger.apiError(url, error, { parseError: parseError.message });
        throw error;
      }
    } catch (error) {
      // Skip logging if error was already logged
      if (error._alreadyLogged) {
        throw error;
      }
      
      // Handle network errors (connection refused, CORS, timeout, etc.)
      if (
        error instanceof TypeError || 
        error.name === 'NetworkError' ||
        error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')
      ) {
        const networkError = new Error(`Network error: Unable to connect to ${url}`);
        networkError.originalError = error;
        networkError.isNetworkError = true;
        networkError.name = error.name || 'NetworkError';
        networkError.message = error.message || networkError.message;
        // Log network errors as warnings to reduce noise
        logger.warn(`Failed to fetch from ${url}: ${networkError.message}`, {
          endpoint: url,
          type: 'network_error'
        });
        throw networkError;
      }
      
      // For other unexpected errors, log them
      logger.apiError(url, error);
      throw error;
    }
  },

  // Global configuration
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2 seconds deduplication
  errorRetryCount: 2,
  errorRetryInterval: 5000, // 5 seconds between retries
  fallbackData: null,

  // Global error handler
  onError: (error, key) => {
    logger.swrError(key, error);
  },

  // Global loading state
  loadingTimeout: 3000, // 3 seconds loading timeout
};

// SWR Provider component
export function SWRProvider({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}

export default swrConfig;
