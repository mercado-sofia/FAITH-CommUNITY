/**
 * Utility functions for handling redirect URLs after authentication
 * Centralizes the logic for storing and retrieving redirect URLs
 */

const REDIRECT_URL_KEY = 'loginRedirectUrl';
const RETURNING_FROM_LOGIN_KEY = 'returningFromLogin';

/**
 * Store the current page URL for redirect after login
 * @param {string} url - The URL to redirect to (defaults to current page)
 */
export const storeRedirectUrl = (url = null) => {
  if (typeof window === 'undefined') return;
  
  const redirectUrl = url || (window.location.pathname + window.location.search);
  sessionStorage.setItem(REDIRECT_URL_KEY, redirectUrl);
};

/**
 * Get the stored redirect URL
 * @returns {string|null} The redirect URL or null if not found
 */
export const getStoredRedirectUrl = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REDIRECT_URL_KEY);
};

/**
 * Clear the stored redirect URL
 */
export const clearRedirectUrl = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(REDIRECT_URL_KEY);
};

/**
 * Set flag indicating user is returning from login
 * Used to preserve form data when redirecting back
 */
export const setReturningFromLogin = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RETURNING_FROM_LOGIN_KEY, 'true');
};

/**
 * Check if user is returning from login
 * @returns {boolean} True if returning from login
 */
export const isReturningFromLogin = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(RETURNING_FROM_LOGIN_KEY) === 'true';
};

/**
 * Clear the returning from login flag
 */
export const clearReturningFromLogin = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RETURNING_FROM_LOGIN_KEY);
};

/**
 * Get redirect URL from query parameter or sessionStorage
 * @param {URLSearchParams} searchParams - URL search params object
 * @returns {string|null} The redirect URL or null
 */
export const getRedirectUrlFromParams = (searchParams) => {
  const redirectParam = searchParams?.get('redirect');
  if (redirectParam) {
    return decodeURIComponent(redirectParam);
  }
  return getStoredRedirectUrl();
};

/**
 * Prepare redirect after login - sets flag and clears stored URL
 * @param {string} redirectUrl - The URL to redirect to
 * @returns {string|null} The redirect path to use, or null if no redirect URL
 */
export const prepareRedirectAfterLogin = (redirectUrl) => {
  if (redirectUrl) {
    setReturningFromLogin();
    clearRedirectUrl();
    return redirectUrl;
  }
  return null;
};

