import useSWR from 'swr';
import logger from '../../../utils/logger';
import { swrConfig } from '../utils/swrConfig';

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
  // Custom fetcher with authentication
  const authenticatedFetcher = async (url) => {
    try {
      const userToken = localStorage.getItem('userToken');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken && { 'Authorization': `Bearer ${userToken}` }),
        },
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        logger.apiError(url, error, { status: response.status });
        throw error;
      }

      return response.json();
    } catch (error) {
      logger.apiError(url, error);
      throw error;
    }
  };

  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/programs/approved/upcoming`,
    authenticatedFetcher,
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
    programs: Array.isArray(data?.data) ? data.data : [],
    isLoading,
    error,
  };
};

// Custom hook for public branding data
export const usePublicBranding = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/branding/public`,
    fetcher,
    {
      dedupingInterval: 300000, // Cache for 5 minutes (branding doesn't change often)
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/superadmin/branding/public`, error);
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const brandingData = data?.data ? {
    logo_url: data.data.logo_url,
    name_url: data.data.name_url,
    favicon_url: data.data.favicon_url,
  } : null;

  return {
    brandingData,
    isLoading,
    error,
  };
};

// Hook for fetching site name data
export const usePublicSiteName = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/branding/site-name/public`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/superadmin/branding/site-name/public`, error);
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const siteNameData = data?.data ? {
    site_name: data.data.site_name || 'FAITH CommUNITY',
  } : { site_name: 'FAITH CommUNITY' };

  return {
    siteNameData,
    isLoading,
    error,
  };
};

// Hook for fetching footer content data
export const usePublicFooterContent = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/footer`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/superadmin/footer`, error);
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const footerData = data?.data ? {
    contact: {
      phone: data.data.contact?.phone?.url || '+163-3654-7896',
      email: data.data.contact?.email?.url || 'info@faithcommunity.com'
    },
    quickLinks: data.data.quickLinks || [
      { name: "About Us", url: "/about" },
      { name: "Programs & Services", url: "/programs" },
      { name: "Faithree", url: "/faithree" },
      { name: "Apply Now", url: "/apply" },
      { name: "FAQs", url: "/faqs" }
    ],
    services: data.data.services || [
      "Give Donation",
      "Education Support",
      "Food Support",
      "Health Support",
      "Our Campaign"
    ],
    socialMedia: data.data.socialMedia || [],
    copyright: data.data.copyright?.content || '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.'
  } : {
    contact: {
      phone: '+163-3654-7896',
      email: 'info@faithcommunity.com'
    },
    quickLinks: [
      { name: "About Us", url: "/about" },
      { name: "Programs & Services", url: "/programs" },
      { name: "Faithree", url: "/faithree" },
      { name: "Apply Now", url: "/apply" },
      { name: "FAQs", url: "/faqs" }
    ],
    services: [
      "Give Donation",
      "Education Support",
      "Food Support",
      "Health Support",
      "Our Campaign"
    ],
    socialMedia: [],
    copyright: '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.'
  };

  return {
    footerData,
    isLoading,
    error,
  };
};

// Hook for fetching hero section data
export const usePublicHeroSection = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/hero-section`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute (hero section changes more frequently)
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/hero-section`, error);
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const heroData = data?.data ? {
    tag: data.data.tag || 'Welcome to FAITH CommUNITY',
    heading: data.data.heading || 'A Unified Platform for Community Extension Programs',
    video_url: data.data.video_url,
    video_link: data.data.video_link,
    video_type: data.data.video_type || 'upload',
    images: data.data.images || [
      { id: 1, url: null, heading: 'Inside the Initiative', subheading: 'Where Ideas Take Root' },
      { id: 2, url: null, heading: 'Collaboration', subheading: 'Working Together' },
      { id: 3, url: null, heading: 'Innovation', subheading: 'Building the Future' }
    ]
  } : {
    tag: 'Welcome to FAITH CommUNITY',
    heading: 'A Unified Platform for Community Extension Programs',
    video_url: null,
    video_link: null,
    video_type: 'upload',
    images: [
      { id: 1, url: null, heading: 'Inside the Initiative', subheading: 'Where Ideas Take Root' },
      { id: 2, url: null, heading: 'Collaboration', subheading: 'Working Together' },
      { id: 3, url: null, heading: 'Innovation', subheading: 'Building the Future' }
    ]
  };

  return {
    heroData,
    isLoading,
    error,
  };
};