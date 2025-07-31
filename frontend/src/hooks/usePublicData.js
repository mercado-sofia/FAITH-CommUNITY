import useSWR from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

// Custom hook for public organization data (optimized for public pages)
export const usePublicOrganizationData = (orgID) => {
  const { data, error, isLoading } = useSWR(
    orgID ? `${API_BASE_URL}/api/org-data/${orgID}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 600000, // Cache for 10 minutes (public data changes less frequently)
      errorRetryCount: 2,
      errorRetryInterval: 2000,
      fallbackData: null, // Provide fallback while loading
    }
  );

  // Transform data for public consumption with fallbacks
  const organizationData = data ? {
    name: data.orgName || 'Organization Not Found',
    acronym: data.org || orgID?.toUpperCase() || 'ORG',
    description: data.description || '',
    facebook: data.facebook || '',
    email: data.email || '',
    logo: data.logo || '/logo/faith_community_logo.png',
    advocacies: data.advocacies || [],
    competencies: data.competencies || [],
    heads: data.heads || [],
    featuredProjects: data.featuredProjects || [],
  } : null;

  return {
    organizationData,
    isLoading,
    error,
    isEmpty: !data && !isLoading && !error,
  };
};

// Custom hook for public organizations list
export const usePublicOrganizations = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/organizations`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      errorRetryCount: 3,
    }
  );

  return {
    organizations: Array.isArray(data?.data) ? data.data : [],
    isLoading,
    error,
  };
};

// Custom hook for public programs
export const usePublicPrograms = (orgID) => {
  const { data, error, isLoading } = useSWR(
    orgID ? `${API_BASE_URL}/api/programs/org/${orgID}` : `${API_BASE_URL}/api/programs`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      errorRetryCount: 2,
    }
  );

  return {
    programs: Array.isArray(data?.data) ? data.data : [],
    isLoading,
    error,
  };
};

// Custom hook for public news/articles
export const usePublicNews = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/public/news`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 180000, // Cache for 3 minutes (news updates more frequently)
      errorRetryCount: 2,
    }
  );

  return {
    news: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for single news article
export const usePublicNewsArticle = (articleId) => {
  const { data, error, isLoading } = useSWR(
    articleId ? `${API_BASE_URL}/api/public/news/${articleId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // Cache for 10 minutes (single articles don't change often)
      errorRetryCount: 2,
    }
  );

  return {
    article: data,
    isLoading,
    error,
  };
};

// Custom hook for FAQs
export const usePublicFAQs = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/public/faqs`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1800000, // Cache for 30 minutes (FAQs rarely change)
      errorRetryCount: 2,
    }
  );

  return {
    faqs: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};
