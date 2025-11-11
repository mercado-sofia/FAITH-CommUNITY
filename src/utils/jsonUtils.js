/**
 * Utility functions for handling JSON data from database
 */

/**
 * Cleans a string that was extracted from JSON using JSON_EXTRACT
 * JSON_EXTRACT returns quoted strings, so we need to remove the surrounding quotes
 * 
 * @param {string} jsonString - The string extracted from JSON
 * @returns {string} - The cleaned string without surrounding quotes
 */
export const cleanJsonString = (jsonString) => {
  if (typeof jsonString === 'string' && jsonString.startsWith('"') && jsonString.endsWith('"')) {
    return jsonString.slice(1, -1); // Remove surrounding quotes
  }
  return jsonString;
};

/**
 * Cleans image data that was extracted from JSON
 * Handles both base64 data URLs and regular URLs
 * 
 * @param {string} imageData - The image data from JSON
 * @returns {string} - The cleaned image data
 */
export const cleanImageData = (imageData) => {
  return cleanJsonString(imageData);
};

/**
 * Checks if a string is a valid base64 image data URL
 * 
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a valid base64 image data URL
 */
export const isBase64Image = (str) => {
  const cleaned = cleanJsonString(str);
  return cleaned && cleaned.startsWith('data:image/');
};
