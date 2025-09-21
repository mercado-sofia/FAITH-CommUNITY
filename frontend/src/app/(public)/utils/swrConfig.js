import { SWRConfig } from 'swr';
import logger from '../../../utils/logger';

// Global SWR configuration
export const swrConfig = {
  // Fetcher function
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
        logger.apiError(url, error, { status: response.status });
        throw error;
      }

      return response.json();
    } catch (error) {
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
