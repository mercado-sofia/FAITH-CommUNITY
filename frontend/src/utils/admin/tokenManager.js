/**
 * Admin Data Management Utility
 * Provides access to admin data stored in localStorage
 * Note: Tokens are now stored in httpOnly cookies, not localStorage
 */

import { clearAuthAndRedirect } from '@/utils/shared/portalAuth';
import logger from '@/utils/shared/logger';

const DATA_KEY = 'adminData';

/**
 * Safely get admin data from localStorage
 * @returns {object|null} The admin data or null if not available
 */
export const getAdminData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(DATA_KEY);
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to parse admin data from localStorage', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(DATA_KEY);
    } catch (e) {
      // Ignore cleanup errors
    }
    return null;
  }
};

/**
 * Check if admin is authenticated and redirect to login if not
 * Since tokens are in httpOnly cookies, this checks for adminData in localStorage
 * @returns {boolean} True if authenticated (adminData exists), false if redirected
 */
export const checkAdminAuthOrRedirect = () => {
  // Since we're using httpOnly cookies, check for adminData instead of token
  // The actual authentication is handled by cookies sent with requests
  const data = getAdminData();
  
  if (!data) {
    clearAuthAndRedirect('admin');
    return false;
  }
  
  return true;
};
