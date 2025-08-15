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
        dedupingInterval: 2000,
        onError: (error) => {
          logger.swrError('Global SWR Error', error);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
