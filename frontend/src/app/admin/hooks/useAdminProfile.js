import useSWR from 'swr';
import logger from '../../../utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Safe localStorage access for SSR
const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem("adminToken");
  } catch (error) {
    logger.error('Failed to access localStorage', error);
    return null;
  }
};

// Fetcher function for admin profile data
const adminProfileFetcher = async (url) => {
  try {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      throw new Error('Cannot fetch on server side');
    }

    const adminToken = getAdminToken();
    
    if (!adminToken) {
      throw new Error('No admin token found. Please log in again.');
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      logger.apiError(url, error, { status: response.status });
      throw error;
    }

    const data = await response.json();
    
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
    `${API_BASE_URL}/api/admin/profile`,
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
        logger.swrError(`${API_BASE_URL}/api/admin/profile`, error);
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
