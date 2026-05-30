import { useMemo } from 'react';
import useSWR from 'swr';
import logger from '@/utils/shared/logger';
import { swrConfig } from '@/utils/(public)/swrConfig';
import { API_BASE_URL } from '@/config/api';
import { FALLBACK_FAVICON_URL, FALLBACK_TEXT_LOGO_URL } from '@/utils/shared/brandingDefaults';
import { normalizeExtensionCategories } from '@/data/siteContent';
import { logoForAcronym } from '@/data/assets';

// Use the global fetcher from swrConfig
const fetcher = swrConfig.fetcher;

// Custom hook for public organization data (optimized for public pages)
export const usePublicOrganizationData = (orgID) => {
  const { data, error, isLoading } = useSWR(
    orgID ? `${API_BASE_URL || ''}/api/organization/org/${orgID}` : null,
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
  // Note: fetcher already unwraps { success: true, data: {...} } to just the data object
  const organizationData = data ? {
    name: data.orgName || 'Organization Not Found',
    acronym: data.org || orgID?.toUpperCase() || 'ORG',
    description: data.description || '',
    facebook: data.facebook || '',
    email: data.email || '',
    logo: data.logo || (data.org || orgID ? logoForAcronym(data.org || orgID) : '/assets/icons/placeholder.svg'),
    advocacies: normalizeTextData(data.advocacies) || '', // Normalize to string
    competencies: normalizeTextData(data.competencies) || '', // Normalize to string
    heads: sortHeadsByOrder(data.heads || []), // Apply same sorting as admin section
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
    `${API_BASE_URL || ''}/api/organizations`,
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
    organizations: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for public programs
export const usePublicPrograms = (orgID) => {
  const { data, error, isLoading } = useSWR(
    orgID ? `${API_BASE_URL || ''}/api/programs/org/${orgID}` : `${API_BASE_URL || ''}/api/programs`,
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

  // Note: fetcher already unwraps { success: true, data: [...] } to just the array
  return {
    programs: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for public news/articles
export const usePublicNews = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/news`,
    fetcher,
    {
      dedupingInterval: 60000, // Cache for 1 minute (news updates more frequently)
      shouldRetryOnError: (error) => {
        // Don't retry on 4xx errors (client errors)
        // Only retry on 5xx errors (server errors) or network errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return true; // Retry on 5xx or network errors
      },
      errorRetryCount: 2,
      errorRetryInterval: 2000,
      onError: (error) => {
        // Handle network errors with better context
        if (error?.isNetworkError) {
          logger.warn(`Failed to fetch news: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/news`,
            type: 'network_error'
          });
        } else {
          // Only log non-404 errors to reduce noise
          if (error?.status !== 404) {
            logger.swrError(`${API_BASE_URL}/api/news`, error);
          }
        }
      }
    }
  );

  // Handle different response formats
  const news = useMemo(() => {
    if (!data) return [];
    
    // If data is already an array, return it
    if (Array.isArray(data)) {
      return data;
    }
    
    // If data has a data property that's an array
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    
    // If data has a success property and data array
    if (data && typeof data === 'object' && data.success && Array.isArray(data.data)) {
      return data.data;
    }
    
    // Fallback to empty array
    return [];
  }, [data]);

  return {
    news,
    isLoading,
    error,
  };
};

// Custom hook for single news article by slug
export const usePublicNewsArticle = (slug) => {
  const url = slug ? `${API_BASE_URL || ''}/api/news/slug/${slug}` : null;
  
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
    `${API_BASE_URL || ''}/api/faqs/active`,
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
// This endpoint is public and does not require authentication
export const usePublicApprovedPrograms = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/programs/approved/upcoming`,
    fetcher,
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

  // Note: fetcher already unwraps { success: true, data: [...] } to just the data array
  return {
    programs: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};

// Custom hook for public branding data
export const usePublicBranding = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/superadmin/branding/public`,
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

  // Transform data for public consumption
  // Note: fetcher should unwrap { success: true, data: {...} } to just the data object
  // Fallback: If fetcher didn't unwrap the data, unwrap it here
  let unwrappedData = data;
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    unwrappedData = data.data;
  }

  // Handle the case where fetcher returns null (when backend returns { success: true, data: null })
  if (unwrappedData === null) {
    return {
      brandingData: {
        logo_url: null,
        name_url: FALLBACK_TEXT_LOGO_URL,
        favicon_url: FALLBACK_FAVICON_URL,
      },
      isLoading,
      error,
    };
  }

  // Transform data object using unwrapped data
  // Preserve non-empty strings, convert empty strings and undefined to null
  const brandingData = unwrappedData && typeof unwrappedData === 'object' ? {
    logo_url: (unwrappedData.logo_url && typeof unwrappedData.logo_url === 'string' && unwrappedData.logo_url.trim() !== '') ? unwrappedData.logo_url : null,
    name_url: (unwrappedData.name_url && typeof unwrappedData.name_url === 'string' && unwrappedData.name_url.trim() !== '')
      ? unwrappedData.name_url
      : FALLBACK_TEXT_LOGO_URL,
    favicon_url: (unwrappedData.favicon_url && typeof unwrappedData.favicon_url === 'string' && unwrappedData.favicon_url.trim() !== '')
      ? unwrappedData.favicon_url
      : FALLBACK_FAVICON_URL,
  } : (!isLoading ? {
    logo_url: null,
    name_url: FALLBACK_TEXT_LOGO_URL,
    favicon_url: FALLBACK_FAVICON_URL,
  } : null);

  return {
    brandingData,
    isLoading,
    error,
  };
};

// Hook for fetching site name data
export const usePublicSiteName = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/superadmin/branding/site-name/public`,
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
  // Note: fetcher already unwraps { success: true, data: {...} } to just the data object
  const siteNameData = data ? {
    site_name: data.site_name || 'FAITH CommUNITY',
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
    `${API_BASE_URL || ''}/api/superadmin/footer`,
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
  // Note: fetcher already unwraps { success: true, data: {...} } to just the data object
  const footerData = data ? {
    contact: {
      phone: data.contact?.phone?.url || '+163-3654-7896',
      email: data.contact?.email?.url || 'info@faithcommunity.com'
    },
    quickLinks: data.quickLinks || [
      { name: "About Us", url: "/about" },
      { name: "Programs & Services", url: "/programs" },
      { name: "Faithree", url: "/faithree" },
      { name: "Apply Now", url: "/apply" },
      { name: "FAQs", url: "/faqs" }
    ],
    services: data.services || [
      "Give Donation",
      "Education Support",
      "Food Support",
      "Health Support",
      "Our Campaign"
    ],
    socialMedia: data.socialMedia || [],
    copyright: data.copyright?.content || '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.'
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
    `${API_BASE_URL || ''}/api/hero-section`,
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
  // Note: fetcher already unwraps { success: true, data: {...} } to just the data object
  const heroData = data ? {
    tag: data.tag || 'Welcome to FAITH CommUNITY',
    heading: data.heading || 'A Unified Platform for Community Extension Programs',
    video_url: data.video_url,
    video_link: data.video_link,
    video_type: data.video_type || 'upload',
    images: data.images || [
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
    `${API_BASE_URL || ''}/api/mission-vision`,
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
    `${API_BASE_URL || ''}/api/superadmin/about-us/public`,
    fetcher,
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

  // Transform data for public consumption - no fallbacks, show empty state if no data
  const aboutUsData = data ? {
    description: data.description || null,
    image_url: data.image_url || null,
    extension_categories: normalizeExtensionCategories(data.extension_categories),
  } : null;

  return {
    aboutUsData,
    isLoading,
    error,
  };
};

// Custom hook for heads of FACES data (single head)
export const usePublicHeadsFaces = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/superadmin/heads-faces`,
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
  // Note: fetcher already unwraps { success: true, data: [...] } to just the array
  const headsFacesData = Array.isArray(data) && data.length > 0 ? data[0] : null;

  return {
    headsFacesData,
    isLoading,
    error,
  };
};

// Custom hook for approved organization advisers
export const usePublicOrganizationAdvisers = () => {
  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/organization-advisers`,
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

  // Note: fetcher already unwraps { success: true, data: [...] } to just the array
  return {
    organizationAdvisers: Array.isArray(data) ? data : [],
    isLoading,
    error,
  };
};