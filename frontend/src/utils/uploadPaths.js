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
    // Handle null, undefined, or non-string values
    if (!imagePath || typeof imagePath !== 'string') {
      return 'IMAGE_UNAVAILABLE';
    }
    
    // Trim whitespace
    imagePath = imagePath.trim();
    
    // If empty after trimming, return fallback
    if (!imagePath) {
      return 'IMAGE_UNAVAILABLE';
    }
    
    // If it's already a full URL or base64, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a Cloudinary public_id, construct the URL
    if (imagePath.includes('faith-community/')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
    }
    
    // If it's not a Cloudinary URL, return fallback
    return 'IMAGE_UNAVAILABLE';
  } catch (error) {
    // More detailed error logging
    console.error('Error in getImageUrl:', {
      error: error.message,
      imagePath: imagePath,
      imagePathType: typeof imagePath,
      type: type,
      subType: subType
    });
    return 'IMAGE_UNAVAILABLE';
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
    // Handle null, undefined, empty values, or non-string values
    if (!imagePath || imagePath === '' || imagePath === null || imagePath === undefined || typeof imagePath !== 'string') {
      return 'IMAGE_UNAVAILABLE';
    }
    
    // Trim whitespace
    imagePath = imagePath.trim();
    
    // If empty after trimming, return fallback
    if (!imagePath) {
      return 'IMAGE_UNAVAILABLE';
    }
    
    // If it's already a full URL or base64, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a Cloudinary public_id, construct the URL
    if (imagePath.includes('faith-community/')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
    }
    
    // If it's not a Cloudinary URL, return fallback
    return 'IMAGE_UNAVAILABLE';
  } catch (error) {
    logger.error('Error in getProgramImageUrl', error, { imagePath, subType });
    return 'IMAGE_UNAVAILABLE';
  }
};

/**
 * Get organization image URL
 * @param {string} imagePath - Image path from database
 * @param {string} subType - 'logo' or 'head'
 * @returns {string} Full URL
 */
export const getOrganizationImageUrl = (imagePath, subType = 'logo') => {
  try {
    // Handle null, undefined, or empty values
    if (!imagePath || imagePath === '' || imagePath === null || imagePath === undefined) {
      return subType === 'head' ? '/defaults/default-profile.png' : '/assets/logos/faith_community_logo.png';
    }
    
    // If it's already a full URL or base64, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a Cloudinary public_id, construct the URL
    if (imagePath.includes('faith-community/')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
    }
    
    // If it's not a Cloudinary URL, return fallback
    return subType === 'head' ? '/defaults/default-profile.png' : '/assets/logos/faith_community_logo.png';
  } catch (error) {
    logger.error('Error in getOrganizationImageUrl', error, { imagePath, subType });
    return subType === 'head' ? '/defaults/default-profile.png' : '/assets/logos/faith_community_logo.png';
  }
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
 * Get profile photo URL
 * @param {string} imagePath - Image path from database
 * @returns {string} Full URL
 */
export const getProfilePhotoUrl = (imagePath) => {
  try {
    if (!imagePath) {
      return '/defaults/default-profile.png';
    }
    
    // If it's already a full URL or base64, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a Cloudinary public_id, construct the URL
    if (imagePath.includes('faith-community/')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${imagePath}`;
    }
    
    // If it's not a Cloudinary URL, return fallback
    return '/defaults/default-profile.png';
  } catch (error) {
    logger.error('Error in getProfilePhotoUrl', error, { imagePath });
    return '/defaults/default-profile.png';
  }
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
  return url.startsWith('http') || url.startsWith('data:') || url.includes('faith-community/');
};

/**
 * Get fallback image URL
 * @param {string} type - Type of fallback image
 * @returns {string} Fallback image URL
 */
export const getFallbackImageUrl = (type = 'default') => {
  const fallbackImages = {
    default: '/defaults/default-profile.png',
    program: '/samples/sample1.jpg',
    organization: '/assets/logos/faith_community_logo.png',
    volunteer: '/defaults/default-profile.png'
  };
  
  return fallbackImages[type] || fallbackImages.default;
};


