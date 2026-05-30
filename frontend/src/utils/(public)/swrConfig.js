import { SWRConfig } from 'swr';
import logger from '../shared/logger';
import { swrFetcherWithFallback } from '@/utils/shared/swrFetcherWithFallback';

// Global SWR configuration
export const swrConfig = {
  fetcher: swrFetcherWithFallback,

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
