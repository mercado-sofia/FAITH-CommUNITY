import useSWR from 'swr';
import { useMemo } from 'react';
import logger from '@/utils/logger';
import { formatDateForAPI } from '@/utils/dateUtils';

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

// Check if JWT token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true; // If we can't parse the token, consider it expired
  }
};

// Check if user is authenticated (has valid token and data)
const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem("adminToken");
    const adminData = localStorage.getItem("adminData");
    
    // Check for token and admin data
    if (!token || !adminData) return false;
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      // Clear expired token
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
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
      const error = new Error('No admin token found. Please log in again.');
      // Don't log this error as it's expected for unauthenticated users
      throw error;
    }
    
    // Check if token is expired
    if (isTokenExpired(adminToken)) {
      // Clear expired token
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      const error = new Error('Your session has expired. Please log in again.');
      throw error;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Handle specific error cases
      if (response.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        // Clear invalid token
        try {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          // Redirect to login page
          window.location.href = '/login';
        } catch (e) {
          // Ignore localStorage errors
        }
      } else if (response.status === 403) {
        errorMessage = 'Access denied. You do not have permission to access this resource.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found.';
      }
      
      const error = new Error(errorMessage);
      logger.apiError(url, error, { 
        status: response.status, 
        statusText: response.statusText,
        type: response.status === 401 ? 'auth_error' : 'api_error'
      });
      throw error;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      const error = new Error('Invalid response format from server');
      logger.apiError(url, error, { type: 'response_format_error', data });
      throw error;
    }

    return data;
  } catch (error) {
    // Only log if it's not already logged (to avoid duplicate logs)
    if (!error.logged && !error.message.includes('No admin token found')) {
      logger.apiError(url, error, { type: 'fetch_error' });
      error.logged = true;
    }
    throw error;
  }
};

// Custom hook for admin submissions data
export const useAdminSubmissions = (orgAcronym) => {
  // Guard clause: only make API call if orgAcronym is valid and user is authenticated
  const shouldFetch = orgAcronym && typeof orgAcronym === 'string' && orgAcronym.trim() !== '' && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/submissions/${orgAcronym}` : null,
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
        if (orgAcronym) {
          logger.swrError(`${API_BASE_URL}/api/submissions/${orgAcronym}`, error, { orgAcronym });
        }
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
  // Guard clause: only make API call if adminId is valid and user is authenticated
  const adminIdStr = adminId ? String(adminId) : null;
  const shouldFetch = adminIdStr && adminIdStr.trim() !== '' && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/volunteers/admin/${adminIdStr}` : null,
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
        if (adminIdStr) {
          logger.swrError(`${API_BASE_URL}/api/volunteers/admin/${adminIdStr}`, error, { adminId: adminIdStr });
        }
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
    contact: volunteer.contact_number || volunteer.phone_number || volunteer.contact || 'No contact',
    address: volunteer.address || 'No address',
    occupation: volunteer.occupation || 'N/A',
    citizenship: volunteer.citizenship || 'N/A',
    program: volunteer.program_name || volunteer.program_title || volunteer.program || 'Unknown Program',
    date: volunteer.created_at ? formatDateForAPI(volunteer.created_at) : '',
    status: volunteer.status || 'Pending',
    reason: volunteer.reason || '',
    validIdFilename: volunteer.valid_id ? volunteer.valid_id.split('/').pop() : null,
    program_id: volunteer.program_id,
    organization_name: volunteer.organization_name || 'Unknown Organization',
    profile_photo_url: volunteer.profile_photo_url || null
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
      const error = new Error('No admin token found. Please log in again.');
      logger.apiError(url, error, { type: 'auth_error', message: 'Missing admin token' });
      throw error;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Handle specific error cases
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Clear invalid token
        try {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
        } catch (e) {
          // Ignore localStorage errors
        }
      } else if (response.status === 403) {
        errorMessage = 'Access denied. You do not have permission to access this resource.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found.';
      }
      
      const error = new Error(errorMessage);
      logger.apiError(url, error, { 
        status: response.status, 
        statusText: response.statusText,
        type: response.status === 401 ? 'auth_error' : 'api_error'
      });
      throw error;
    }

    const data = await response.json();
    
    // Don't modify the response data - let the backend handle logo properly
    return data;
  } catch (error) {
    // Only log if it's not already logged (to avoid duplicate logs)
    if (!error.logged) {
      logger.apiError(url, error, { type: 'fetch_error' });
      error.logged = true;
    }
    throw error;
  }
};

// Custom hook for admin organization data by organization ID
export const useAdminOrganization = (organizationId) => {
  // Guard clause: only make API call if organizationId is valid and user is authenticated
  const shouldFetch = organizationId && (typeof organizationId === 'number' || (typeof organizationId === 'string' && !isNaN(organizationId))) && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/organization/${organizationId}` : null,
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
        if (organizationId) {
          logger.swrError(`${API_BASE_URL}/api/organization/${organizationId}`, error, { organizationId });
        }
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
export const useAdminPrograms = () => {
  // Guard clause: only make API call if user is authenticated
  const shouldFetch = isAuthenticated();
  
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/admin/programs` : null,
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
        // Only log if user is authenticated (to avoid spam from unauthenticated users)
        if (isAuthenticated()) {
          logger.swrError(`${API_BASE_URL}/api/admin/programs`, error);
        }
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
  // Guard clause: only make API call if orgAcronym is valid and user is authenticated
  const shouldFetch = orgAcronym && typeof orgAcronym === 'string' && orgAcronym.trim() !== '' && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/news/org/${orgAcronym}` : null,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 2, // Reduced retry count
      errorRetryInterval: 2000, // Faster retry interval
      keepPreviousData: true, // Keep previous data while loading
      shouldRetryOnError: (error) => {
        // Don't retry on 401 (auth errors), 404 (not found), or 403 (forbidden)
        return error.status !== 401 && error.status !== 404 && error.status !== 403;
      },
      onError: (error) => {
        // Only log if orgAcronym is valid to avoid spam
        if (orgAcronym) {
          logger.swrError(`${API_BASE_URL}/api/news/org/${orgAcronym}`, error, { orgAcronym });
        }
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
  // Guard clause: only make API call if orgId is valid and user is authenticated
  const shouldFetch = orgId && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/advocacies/${orgId}` : null,
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
        if (orgId) {
          logger.swrError(`${API_BASE_URL}/api/advocacies/${orgId}`, error, { orgId });
        }
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
  // Guard clause: only make API call if orgId is valid and user is authenticated
  const shouldFetch = orgId && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/competencies/${orgId}` : null,
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
        if (orgId) {
          logger.swrError(`${API_BASE_URL}/api/competencies/${orgId}`, error, { orgId });
        }
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
  // Guard clause: only make API call if orgId is valid and user is authenticated
  const shouldFetch = orgId && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/heads/${orgId}` : null,
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
        if (orgId) {
          logger.swrError(`${API_BASE_URL}/api/heads/${orgId}`, error, { orgId });
        }
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
  // Guard clause: only make API call if adminId is valid and user is authenticated
  const shouldFetch = adminId && isAuthenticated();
  
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `${API_BASE_URL}/api/admins/${adminId}` : null,
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
        if (adminId) {
          logger.swrError(`${API_BASE_URL}/api/admins/${adminId}`, error, { adminId });
        }
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
