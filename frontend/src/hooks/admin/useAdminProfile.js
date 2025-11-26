import useSWR from 'swr';
import logger from '@/utils/shared/logger';
import { API_BASE_URL } from '@/config/api';

// Fetcher function for admin profile data (now uses httpOnly cookies)
const adminProfileFetcher = async (url) => {
  try {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      throw new Error('Cannot fetch on server side');
    }

    // Tokens are in httpOnly cookies - sent automatically with credentials: 'include'
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // CRITICAL: Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header needed - cookies handle this
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      logger.apiError(url, error, { status: response.status });
      throw error;
    }

    // Parse JSON with error handling
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const error = new Error('Invalid JSON response from server');
      logger.apiError(url, error, { type: 'json_parse_error', parseError: parseError.message });
      throw error;
    }
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    logger.apiError(url, error);
    throw error;
  }
};

// Custom hook for admin profile data
export const useAdminProfile = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL || ''}/api/admin/profile`,
    adminProfileFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // Cache for 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL || ''}/api/admin/profile`, error);
      }
    }
  );

  return {
    admin: data?.success ? data.data : null,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};
