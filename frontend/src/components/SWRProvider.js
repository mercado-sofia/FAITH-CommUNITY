'use client';

import { SWRConfig } from 'swr';
import logger from '../utils/logger';

export default function SWRProvider({ children }) {
  return (
    <SWRConfig 
      value={{
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 2000,
        dedupingInterval: 2000,
        focusThrottleInterval: 5000,
        loadingTimeout: 3000,
        onError: (error, key) => {
          logger.swrError(`SWR Error for key: ${key}`, error, { key });
        },
        onSuccess: (data, key) => {
          logger.info(`SWR Success for key: ${key}`, { dataLength: Array.isArray(data) ? data.length : 'non-array' });
        },
        compare: (a, b) => {
          // Custom comparison function to prevent unnecessary re-renders
          if (a === b) return true;
          if (!a || !b) return false;
          if (typeof a !== typeof b) return false;
          if (Array.isArray(a) !== Array.isArray(b)) return false;
          if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            return a.every((item, index) => item === b[index]);
          }
          return false;
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
