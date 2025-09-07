import useSWR from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Fetcher function for SWR
const fetcher = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  return response.json();
};

// Custom hook for programs data
export const usePrograms = () => {
  const adminData = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('adminData') || '{}')
    : {};
  const orgId = adminData.org;

  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/admin/programs/${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    programs: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate, // For manual revalidation after mutations
  };
};

// Custom hook for organization data
export const useOrganizationData = (orgId) => {
  const { data, error, isLoading } = useSWR(
    orgId ? `${API_BASE_URL}/api/org-data/${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes (org data changes less frequently)
    }
  );

  return {
    organizationData: data,
    isLoading,
    error,
  };
};

// Custom hook for submissions
export const useSubmissions = () => {
  const adminData = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('adminData') || '{}')
    : {};
  const orgId = adminData.org;

  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/admin/submissions/${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: true, // Submissions change more frequently
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );

  return {
    submissions: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
  };
};
