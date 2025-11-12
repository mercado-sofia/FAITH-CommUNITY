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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch organization data: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/organization/org/${orgID}`,
            orgID,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/organization/org/${orgID}`, error, { orgID });
        }
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

  // Helper function to normalize advocacy/competency data
  const normalizeTextData = (value) => {
    if (!value) return ""
    
    // If it's already a string, check if it's a JSON string
    if (typeof value === 'string') {
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value)
        // If parsed result is an object (like {}), return empty string
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
          return ""
        }
        // If parsed result is a string, return it
        if (typeof parsed === 'string') {
          return parsed
        }
        // Otherwise return empty string for other object types
        return ""
      } catch (e) {
        // Not JSON, return as-is
        return value
      }
    }
    
    // If it's an object, check if it's empty
    if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length === 0) {
        return ""
      }
      // If object has content, try to stringify (shouldn't happen, but handle it)
      return JSON.stringify(value)
    }
    
    // For other types, convert to string
    return String(value)
  }

  // Transform data for public consumption with fallbacks
  const organizationData = data?.data ? {
    name: data.data.orgName || 'Organization Not Found',
    acronym: data.data.org || orgID?.toUpperCase() || 'ORG',
    description: data.data.description || '',
    facebook: data.data.facebook || '',
    email: data.data.email || '',
    logo: data.data.logo || '/assets/icons/placeholder.svg',
    advocacies: normalizeTextData(data.data.advocacies) || '', // Normalize to string
    competencies: normalizeTextData(data.data.competencies) || '', // Normalize to string
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch organizations: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/organizations`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/organizations`, error);
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch programs: ${error.message}`, {
            endpoint: orgID ? `${API_BASE_URL}/api/programs/org/${orgID}` : `${API_BASE_URL}/api/programs`,
            orgID,
            type: 'network_error'
          });
        } else {
          logger.swrError(orgID ? `${API_BASE_URL}/api/programs/org/${orgID}` : `${API_BASE_URL}/api/programs`, error, { orgID });
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch news: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/news`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/news`, error);
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch news article: ${error.message}`, {
            endpoint: url,
            slug,
            type: 'network_error'
          });
        } else {
          logger.swrError(url, error, { slug });
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch FAQs: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/faqs/active`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/faqs/active`, error);
        }
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
  // Custom fetcher with authentication and automatic token refresh
  const authenticatedFetcher = async (url) => {
    try {
      // Use authenticatedFetch for automatic token refresh
      const { authenticatedFetch } = await import('@/utils/apiClient');
      const response = await authenticatedFetch(url, {
        method: 'GET',
      }, 'user');

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error._alreadyLogged = true; // Mark as already logged
        logger.apiError(url, error, { status: response.status });
        throw error;
      }

      // Parse JSON with error handling
      try {
        return await response.json();
      } catch (parseError) {
        const error = new Error('Invalid JSON response from server');
        error.originalError = parseError;
        error._alreadyLogged = true; // Mark as already logged
        logger.apiError(url, error, { parseError: parseError.message });
        throw error;
      }
    } catch (error) {
      // Skip logging if error was already logged
      if (error._alreadyLogged) {
        throw error;
      }
      
      // Handle network errors (connection refused, CORS, timeout, etc.)
      if (
        error instanceof TypeError || 
        error.name === 'NetworkError' ||
        error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')
      ) {
        const networkError = new Error(`Network error: Unable to connect to ${url}`);
        networkError.originalError = error;
        networkError.isNetworkError = true;
        networkError.name = error.name || 'NetworkError';
        networkError.message = error.message || networkError.message;
        throw networkError;
      }
      
      // For other unexpected errors, log them
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch approved programs: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/programs/approved/upcoming`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/programs/approved/upcoming`, error);
        }
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
      revalidateOnFocus: false, // Don't revalidate on window focus
      revalidateOnReconnect: false, // Don't revalidate on reconnect
      revalidateIfStale: false, // Don't revalidate if stale
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch branding data: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/branding/public`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/branding/public`, error);
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch site name: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/branding/site-name/public`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/branding/site-name/public`, error);
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch footer content: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/footer`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/footer`, error);
        }
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
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch hero section: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/hero-section`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/hero-section`, error);
        }
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

// Hook for fetching mission and vision data
export const usePublicMissionVision = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/mission-vision`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes (mission/vision doesn't change often)
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch mission/vision: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/mission-vision`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/mission-vision`, error);
        }
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const missionVisionData = {
    mission: data?.find(item => item.type === 'Mission')?.content || 
            'To serve communities through education and engagement, fostering growth and development for a better tomorrow.',
    vision: data?.find(item => item.type === 'Vision')?.content || 
            'To be the leading platform for community extension programs, creating lasting positive impact in society.'
  };

  return {
    missionVisionData,
    isLoading,
    error,
  };
};

// Hook for fetching about us data
export const usePublicAboutUs = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/about-us/public`,
    async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          error.status = response.status;
          error.statusText = response.statusText;
          throw error;
        }
        const result = await response.json();
        return result.data;
      } catch (error) {
        // Handle network errors
        if (
          error instanceof TypeError || 
          error.name === 'NetworkError' ||
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')
        ) {
          const networkError = new Error(`Network error: Unable to connect to ${url}`);
          networkError.originalError = error;
          networkError.isNetworkError = true;
          networkError.name = error.name || 'NetworkError';
          networkError.message = error.message || networkError.message;
          throw networkError;
        }
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes (about us doesn't change often)
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch about us: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/about-us/public`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/about-us/public`, error);
        }
      }
    }
  );

  // Transform data for public consumption with fallbacks
  const aboutUsData = {
    description: data?.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    image_url: data?.image_url || '/samples/sample1.jpg',
    extension_categories: data?.extension_categories || [
      { name: 'Extension For Education', icon: 'education', color: 'green' },
      { name: 'Extension For Medical', icon: 'medical', color: 'red' },
      { name: 'Extension For Community', icon: 'community', color: 'orange' },
      { name: 'Extension For Foods', icon: 'food', color: 'green' }
    ]
  };

  return {
    aboutUsData,
    isLoading,
    error,
  };
};

// Custom hook for heads of FACES data (single head)
export const usePublicHeadsFaces = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/heads-faces`,
    fetcher,
    {
      dedupingInterval: 60000, // Cache for 1 minute
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch heads/faces: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/heads-faces`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/heads-faces`, error);
        }
      }
    }
  );

  // Transform data for public consumption - now returns single head or null
  const headsFacesData = data?.data && data.data.length > 0 ? data.data[0] : null;

  return {
    headsFacesData,
    isLoading,
    error,
  };
};

// Custom hook for approved organization advisers
export const usePublicOrganizationAdvisers = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/organization-advisers`,
    fetcher,
    {
      dedupingInterval: 300000, // Cache for 5 minutes
      shouldRetryOnError: false, // Don't retry on error to prevent spam
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch organization advisers: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/organization-advisers`,
            type: 'network_error'
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/organization-advisers`, error);
        }
      }
    }
  );

  return {
    organizationAdvisers: data?.data || [],
    isLoading,
    error,
  };
};