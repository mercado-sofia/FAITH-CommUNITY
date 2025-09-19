import useSWR from 'swr';
import logger from '../../../utils/logger';
import { swrConfig } from '../../../utils/swrConfig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Use the global fetcher from swrConfig
const fetcher = swrConfig.fetcher;

// Custom hook for public organization data (optimized for public pages)
export const usePublicOrganizationData = (orgID) => {
  const { data, error, isLoading } = useSWR(
    orgID ? `${API_BASE_URL}/api/organization/org/${orgID}` : null,
    fetcher,
    {
      dedupingInterval: 60000, // Cache for 1 minute (to reflect admin changes quickly)
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/organization/org/${orgID}`, error, { orgID });
      }
    }
  );

  // Sort heads by display_order (same logic as admin section)
  const sortHeadsByOrder = (heads) => {
    return [...heads].sort((a, b) => {
      // Sort by display_order if available
      const orderA = a.display_order || 999;
      const orderB = b.display_order || 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order or no order, sort by name
      return (a.head_name || '').localeCompare(b.head_name || '');
    });
  };

  // Transform data for public consumption with fallbacks
  const organizationData = data?.data ? {
    name: data.data.orgName || 'Organization Not Found',
    acronym: data.data.org || orgID?.toUpperCase() || 'ORG',
    description: data.data.description || '',
    facebook: data.data.facebook || '',
    email: data.data.email || '',
    logo: data.data.logo || '/logo/faith_community_logo.png',
    advocacies: data.data.advocacies || '', // Backend returns string, not array
    competencies: data.data.competencies || '', // Backend returns string, not array
    heads: sortHeadsByOrder(data.data.heads || []), // Apply same sorting as admin section
    featuredProjects: data.data.featuredProjects || [],
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
      dedupingInterval: 300000, // Cache for 5 minutes
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/organizations`, error);
      }
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
      onError: (error) => {
        logger.swrError(orgID ? `${API_BASE_URL}/api/programs/org/${orgID}` : `${API_BASE_URL}/api/programs`, error, { orgID });
      }
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
    `${API_BASE_URL}/api/news`,
    fetcher,
    {
      dedupingInterval: 60000, // Cache for 1 minute (news updates more frequently)
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/news`, error);
      }
    }
  );

  return {
    news: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for single news article by slug
export const usePublicNewsArticle = (slug) => {
  const url = slug ? `${API_BASE_URL}/api/news/slug/${slug}` : null;
  
  const { data, error, isLoading } = useSWR(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // Cache for 10 minutes (single articles don't change often)
      errorRetryCount: 2,
      onError: (error) => {
        logger.swrError(url, error, { slug });
      }
    }
  );


  return {
    article: data,
    isLoading,
    error: error?.message || error,
  };
};

// Custom hook for FAQs
export const usePublicFAQs = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/faqs/active`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1800000, // Cache for 30 minutes (FAQs rarely change)
      errorRetryCount: 2,
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/faqs/active`, error);
      }
    }
  );

  return {
    faqs: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for approved upcoming programs (for apply form)
export const usePublicApprovedPrograms = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/programs/approved/upcoming`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      errorRetryCount: 2,
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/programs/approved/upcoming`, error);
      }
    }
  );

  return {
    programs: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};
