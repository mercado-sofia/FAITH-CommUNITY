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
        // Try to parse error response body for more details
        let errorData = null;
        let errorText = '';
        try {
          // Clone the response to read it without consuming the stream
          const clonedResponse = response.clone();
          errorText = await clonedResponse.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If not JSON, treat as plain text error message
              errorData = { message: errorText, raw: errorText };
            }
          }
        } catch (textError) {
          // If we can't read the response, that's okay - we'll use status info
          console.warn('[FETCHER] Could not read error response text:', textError);
        }

        // Log detailed error information (only in development to reduce console noise)
        const status = response.status;
        const statusText = response.statusText || 'Unknown';
        const errorMessage = errorData?.message || errorData?.error || errorData?.raw || `HTTP ${status}: ${statusText}`;
        
        // Only log to console in development, use logger for all environments
        if (process.env.NODE_ENV === 'development') {
          console.error(`[FETCHER] Response not OK for ${url}:`, {
            status: String(status),
            statusText: String(statusText),
            errorText: errorText || '(empty)',
            errorData: errorData || null,
            hasHeaders: !!response.headers
          });
        }

        const error = new Error(errorMessage);
        error.status = status;
        error.statusText = statusText;
        error.data = errorData;
        error.responseText = errorText;
        error._alreadyLogged = true;
        
        // Log with full context using logger (handles dev/prod appropriately)
        logger.apiError(url, error, { 
          status: String(status), 
          statusText: String(statusText),
          errorData: errorData || null,
          responseText: errorText || '(empty)'
        });
        throw error;
      }

      // Parse JSON with error handling
      try {
        // Check if response has content
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        // Handle empty responses
        if (!text || text.trim() === '') {
          // Empty response - return empty array for news endpoints
          if (url.includes('/api/news')) {
            return [];
          }
          return null;
        }
        
        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // If content-type says JSON but parsing fails, that's an error
          if (contentType.includes('application/json')) {
            throw new Error(`Invalid JSON response: ${parseError.message}`);
          }
          // Otherwise, return the text as-is (shouldn't happen for our API)
          return text;
        }
        
        // Handle wrapped responses (e.g., { success: true, data: [...] })
        if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
          return data.data;
        }
        return data;
      } catch (parseError) {
        const error = new Error(`Invalid JSON response from server: ${parseError.message}`);
        error.originalError = parseError;
        error.status = response.status;
        error.statusText = response.statusText;
        error._alreadyLogged = true;
        logger.apiError(url, error, { 
          parseError: parseError.message,
          status: response.status,
          statusText: response.statusText
        });
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
        (error.message && (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')
        ))
      ) {
        const networkError = new Error(`Network error: Unable to connect to ${url}`);
        networkError.originalError = error;
        networkError.isNetworkError = true;
        networkError.name = error.name || 'NetworkError';
        networkError.message = error.message || networkError.message;
        networkError._alreadyLogged = true;
        logger.warn(`Failed to fetch from ${url}: ${networkError.message}`, {
          endpoint: url,
          type: 'network_error',
          originalError: error.message || error.toString()
        });
        throw networkError;
      }
      
      // For other unexpected errors, ensure error has message
      const errorWithMessage = error instanceof Error 
        ? error 
        : new Error(error?.toString() || 'Unknown error occurred');
      if (!errorWithMessage.message) {
        errorWithMessage.message = error?.toString() || 'Unknown error occurred';
      }
      logger.apiError(url, errorWithMessage, { 
        originalError: error,
        errorType: typeof error
      });
      throw errorWithMessage;
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
