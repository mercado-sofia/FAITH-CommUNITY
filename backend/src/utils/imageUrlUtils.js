/**
 * Image URL utility functions for Cloudinary integration
 * All images are now stored in Cloudinary
 */

/**
 * Get the appropriate image URL for display
 * @param {string} imagePath - The image path from database
 * @param {string} fallbackUrl - Fallback URL if imagePath is invalid
 * @returns {string} The complete image URL
 */
export const getImageUrl = (imagePath, fallbackUrl = '/logo/faith_community_logo.png') => {
  if (!imagePath) {
    return fallbackUrl;
  }

  // If it's already a full Cloudinary URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('https')) {
    return imagePath;
  }

  // If it's a Cloudinary public_id, construct the URL
  if (imagePath.includes('faith-community/')) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${imagePath}`;
  }

  // If it's not a Cloudinary URL, return fallback
  return fallbackUrl;
};

/**
 * Get organization logo URL
 * @param {string} orgLogo - Organization logo path from database
 * @returns {string} Complete logo URL
 */
export const getOrganizationLogoUrl = (orgLogo) => {
  return getImageUrl(orgLogo, '/logo/faith_community_logo.png');
};

/**
 * Get program image URL
 * @param {string} imagePath - Program image path from database
 * @returns {string} Complete image URL
 */
export const getProgramImageUrl = (imagePath) => {
  return getImageUrl(imagePath, '/sample/sample1.jpg');
};

/**
 * Get news image URL
 * @param {string} imagePath - News image path from database
 * @returns {string} Complete image URL
 */
export const getNewsImageUrl = (imagePath) => {
  return getImageUrl(imagePath, '/sample/sample1.jpg');
};

/**
 * Get user profile photo URL
 * @param {string} profilePhotoUrl - Profile photo URL from database
 * @returns {string} Complete profile photo URL
 */
export const getUserProfilePhotoUrl = (profilePhotoUrl) => {
  return getImageUrl(profilePhotoUrl, '/default-profile.png');
};

/**
 * Check if an image path is a Cloudinary URL
 * @param {string} imagePath - Image path to check
 * @returns {boolean} True if it's a Cloudinary URL
 */
export const isCloudinaryUrl = (imagePath) => {
  if (!imagePath) return false;
  return imagePath.startsWith('http') || imagePath.includes('cloudinary.com') || imagePath.includes('faith-community/');
};

/**
 * Check if an image path is a valid Cloudinary URL
 * @param {string} imagePath - Image path to check
 * @returns {boolean} True if it's a valid Cloudinary URL
 */
export const isValidCloudinaryUrl = (imagePath) => {
  if (!imagePath) return false;
  return imagePath.startsWith('http') || imagePath.includes('cloudinary.com') || imagePath.includes('faith-community/');
};
