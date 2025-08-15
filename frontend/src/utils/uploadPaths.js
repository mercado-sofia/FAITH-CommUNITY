import logger from './logger';

// Upload path utility for consistent image URL handling
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

/**
 * Get the full URL for an uploaded image
 * @param {string} imagePath - The image path from database
 * @param {string} type - The type of upload (programs, organizations, volunteers, news)
 * @param {string} subType - The subtype (main, additional, logos, heads, valid-ids, images)
 * @returns {string} Full URL to the image
 */
export const getImageUrl = (imagePath, type = 'programs', subType = 'main') => {
  try {
    logger.debug('getImageUrl called', { imagePath, type, subType });
    
    if (!imagePath) {
      logger.debug('Empty imagePath, returning fallback');
      return '/default-profile.png';
    }
    
    // If it's already a full URL or base64, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      logger.debug('Full URL or base64 detected, returning as is');
      return imagePath;
    }
    
    // Handle legacy paths (old structure)
    if (imagePath.includes('/')) {
      // Extract filename from path
      const filename = imagePath.split('/').pop();
      const result = `${BACKEND_URL}/uploads/${type}/${subType}/${filename}`;
      logger.debug('Legacy path result', { result });
      return result;
    }
    
    // New structure - direct filename
    const result = `${BACKEND_URL}/uploads/${type}/${subType}/${imagePath}`;
    logger.debug('New structure result', { result });
    return result;
  } catch (error) {
    logger.error('Error in getImageUrl', error, { imagePath, type, subType });
    return '/default-profile.png';
  }
};

/**
 * Get program image URL
 * @param {string} imagePath - Image path from database
 * @param {string} subType - 'main' or 'additional'
 * @returns {string} Full URL
 */
export const getProgramImageUrl = (imagePath, subType = 'main') => {
  try {
    logger.debug('getProgramImageUrl called', { imagePath, subType });
    
    // Handle null, undefined, or empty values
    if (!imagePath || imagePath === '' || imagePath === null || imagePath === undefined) {
      logger.debug('Empty imagePath, returning fallback');
      return '/default-profile.png';
    }
    
    const result = getImageUrl(imagePath, 'programs', subType === 'additional' ? 'additional-images' : 'main-images');
    logger.debug('getProgramImageUrl result', { result });
    return result;
  } catch (error) {
    logger.error('Error in getProgramImageUrl', error, { imagePath, subType });
    return '/default-profile.png';
  }
};

/**
 * Get organization image URL
 * @param {string} imagePath - Image path from database
 * @param {string} subType - 'logo' or 'head'
 * @returns {string} Full URL
 */
export const getOrganizationImageUrl = (imagePath, subType = 'logo') => {
  // If the path already starts with /uploads/, it's a full path from backend
  if (imagePath && imagePath.startsWith('/uploads/')) {
    return `${BACKEND_URL}${imagePath}`;
  }
  
  // If it's a full URL, return as is
  if (imagePath && (imagePath.startsWith('http') || imagePath.startsWith('data:'))) {
    return imagePath;
  }
  
  // Otherwise, construct the URL using the utility function
  return getImageUrl(imagePath, 'organizations', subType === 'head' ? 'heads' : 'logos');
};

/**
 * Get volunteer valid ID URL
 * @param {string} imagePath - Image path from database
 * @returns {string} Full URL
 */
export const getVolunteerIdUrl = (imagePath) => {
  return getImageUrl(imagePath, 'volunteers', 'valid-ids');
};

/**
 * Get news image URL
 * @param {string} imagePath - Image path from database
 * @returns {string} Full URL
 */
export const getNewsImageUrl = (imagePath) => {
  return getImageUrl(imagePath, 'news', 'images');
};

/**
 * Get featured project image URL (legacy support)
 * @param {string} imagePath - Image path from database
 * @returns {string} Full URL
 */
export const getFeaturedProjectImageUrl = (imagePath) => {
  // Featured projects might be stored in programs/main-images
  return getImageUrl(imagePath, 'programs', 'main-images');
};

/**
 * Check if an image URL is valid
 * @param {string} url - Image URL to check
 * @returns {boolean} True if valid
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/uploads/');
};

/**
 * Get fallback image URL
 * @param {string} type - Type of fallback image
 * @returns {string} Fallback image URL
 */
export const getFallbackImageUrl = (type = 'default') => {
  const fallbackImages = {
    default: '/default-profile.png',
    program: '/sample/sample1.jpg',
    organization: '/logo/facts_logo.jpg',
    volunteer: '/default-profile.png'
  };
  
  return fallbackImages[type] || fallbackImages.default;
};
