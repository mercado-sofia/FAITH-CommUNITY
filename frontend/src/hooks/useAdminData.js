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

// Custom hook for admin organization data
export const useAdminOrganization = (orgId) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/admin/organization/${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // Cache for 5 minutes (org data changes less frequently)
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    organization: data,
    isLoading,
    error,
    mutate, // For manual revalidation after mutations
  };
};

// Custom hook for admin profile data
export const useAdminProfile = (adminId) => {
  const { data, error, isLoading, mutate } = useSWR(
    adminId ? `${API_BASE_URL}/api/admin/profile/${adminId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // Cache for 10 minutes (profile data changes rarely)
    }
  );

  return {
    profile: data,
    isLoading,
    error,
    mutate,
  };
};

// Custom hook for admin dashboard data
export const useAdminDashboard = (orgId) => {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `${API_BASE_URL}/api/admin/dashboard/${orgId}` : null,
    fetcher,
    {
      revalidateOnFocus: true, // Dashboard data should be fresh
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    dashboardData: data,
    isLoading,
    error,
    mutate,
  };
};
