import useSWR from 'swr';
import { useMemo } from 'react';
import logger from '../utils/logger';

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

// Fetcher function for SWR with admin authentication and SSR safety
const adminFetcher = async (url) => {
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

// Custom hook for admin submissions data
export const useAdminSubmissions = (orgAcronym) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgAcronym ? `${API_BASE_URL}/api/submissions/${orgAcronym}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Cache for 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/submissions/${orgAcronym}`, error, { orgAcronym });
      }
    }
  );

  // Ensure we always return an array for submissions
  const submissions = data?.success && Array.isArray(data.data) ? data.data : [];

  return {
    submissions,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin volunteers data
export const useAdminVolunteers = (adminId) => {
  const { data, error, isLoading, mutate } = useSWR(
    adminId ? `${API_BASE_URL}/api/volunteers/admin/${adminId}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Cache for 30 seconds (faster updates)
      errorRetryCount: 2, // Reduced retries for faster failure
      errorRetryInterval: 1000, // Faster retry interval
      keepPreviousData: true, // Keep previous data while loading new data
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/volunteers/admin/${adminId}`, error, { adminId });
      }
    }
  );

  // Transform volunteers data to match expected format with error handling
  const volunteers = data?.success && Array.isArray(data.data) ? data.data : [];
  const transformedVolunteers = volunteers.map(volunteer => ({
    id: volunteer.id,
    name: volunteer.full_name || volunteer.name || 'Unknown Name',
    age: volunteer.age || 'N/A',
    gender: volunteer.gender || 'N/A',
    email: volunteer.email || 'No email',
    contact: volunteer.phone_number || volunteer.contact || 'No contact',
    address: volunteer.address || 'No address',
    occupation: volunteer.occupation || 'N/A',
    citizenship: volunteer.citizenship || 'N/A',
    program: volunteer.program_name || volunteer.program_title || volunteer.program || 'Unknown Program',
    date: volunteer.created_at ? new Date(volunteer.created_at).toISOString().split('T')[0] : '',
    status: volunteer.status || 'Pending',
    reason: volunteer.reason || '',
    validIdFilename: volunteer.valid_id ? volunteer.valid_id.split('/').pop() : null,
    program_id: volunteer.program_id,
    organization_name: volunteer.organization_name || 'Unknown Organization'
  }));

  return {
    volunteers: transformedVolunteers,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom fetcher for organization data
const organizationFetcher = async (url) => {
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
    
    // Don't modify the response data - let the backend handle logo properly
    return data;
  } catch (error) {
    logger.apiError(url, error);
    throw error;
  }
};

// Custom hook for admin organization data
export const useAdminOrganization = (orgAcronym) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgAcronym ? `${API_BASE_URL}/api/organization/org/${orgAcronym}` : null,
    organizationFetcher,
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
        logger.swrError(`${API_BASE_URL}/api/organization/org/${orgAcronym}`, error, { orgAcronym });
      }
    }
  );

  // Ensure organization data is always properly structured with logo preserved
  const organization = useMemo(() => {
    if (!data?.success || !data.data) return null;
    
    const orgData = data.data;
    
    // Ensure logo is always preserved and never undefined/null
    return {
      ...orgData,
      logo: orgData.logo || "", // Ensure logo is never undefined
      org: orgData.org || "",
      orgName: orgData.orgName || "",
      email: orgData.email || "",
      facebook: orgData.facebook || "",
      description: orgData.description || "",
      org_color: orgData.org_color || "#444444"
    };
  }, [data]);

  return {
    organization,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin programs data
export const useAdminPrograms = (orgAcronym) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgAcronym ? `${API_BASE_URL}/api/programs/org/${orgAcronym}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 120000, // Cache for 2 minutes
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/programs/org/${orgAcronym}`, error, { orgAcronym });
      }
    }
  );

  // Ensure we always return an array for programs
  const programs = data?.success && Array.isArray(data.data) ? data.data : [];

  return {
    programs,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin news data
export const useAdminNews = (orgAcronym) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgAcronym ? `${API_BASE_URL}/api/news/org/${orgAcronym}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/news/org/${orgAcronym}`, error, { orgAcronym });
      }
    }
  );

  // Handle both response formats: direct array or { success: true, data: [...] }
  const news = useMemo(() => {
    if (!data) return [];
    
    // If data is an array (direct response from backend)
    if (Array.isArray(data)) {
      return data;
    }
    
    // If data has success/data structure
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  }, [data]);

  return {
    news,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin advocacies data
export const useAdminAdvocacies = (orgId) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/advocacies/${orgId}` : null,
    adminFetcher,
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
        logger.swrError(`${API_BASE_URL}/api/advocacies/${orgId}`, error, { orgId });
      }
    }
  );

  // Ensure we always return an array for advocacies
  const advocacies = data?.success && Array.isArray(data.data) ? data.data : [];

  return {
    advocacies,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin competencies data
export const useAdminCompetencies = (orgId) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/competencies/${orgId}` : null,
    adminFetcher,
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
        logger.swrError(`${API_BASE_URL}/api/competencies/${orgId}`, error, { orgId });
      }
    }
  );

  // Ensure we always return an array for competencies
  const competencies = data?.success && Array.isArray(data.data) ? data.data : [];

  return {
    competencies,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin heads data
export const useAdminHeads = (orgId) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/heads/${orgId}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute (shorter cache for heads)
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors) or 404 (not found)
        return error.status !== 401 && error.status !== 404;
      },
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/heads/${orgId}`, error, { orgId });
      }
    }
  );

  // Ensure we always return an array for heads
  const heads = data?.success && Array.isArray(data.data) ? data.data : [];

  return {
    heads,
    isLoading,
    error,
    mutate,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for admin data by ID
export const useAdminById = (adminId) => {
  const { data, error, isLoading, mutate } = useSWR(
    adminId ? `${API_BASE_URL}/api/admins/${adminId}` : null,
    adminFetcher,
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
        logger.swrError(`${API_BASE_URL}/api/admins/${adminId}`, error, { adminId });
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
