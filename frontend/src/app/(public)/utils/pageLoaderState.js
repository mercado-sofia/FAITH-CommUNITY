/**
 * Centralized page loader state management for (public) portal only
 * This keeps track of which pages have been visited to provide consistent loading behavior
 */

// Global state for tracking visited pages within (public) portal
let hasVisitedPages = {};
let isFirstVisitPages = {};

/**
 * Get the current loading state for a specific page
 * @param {string} pageName - The name of the page (e.g., 'home', 'about', 'profile')
 * @returns {Object} - Object containing hasVisited and isFirstVisit flags
 */
export const getPageLoaderState = (pageName) => {
  return {
    hasVisited: hasVisitedPages[pageName] || false,
    isFirstVisit: isFirstVisitPages[pageName] !== false
  };
};

/**
 * Mark a page as visited
 * @param {string} pageName - The name of the page to mark as visited
 */
export const markPageAsVisited = (pageName) => {
  hasVisitedPages[pageName] = true;
  isFirstVisitPages[pageName] = false;
};

/**
 * Reset all page visit states (useful for testing or logout scenarios)
 */
export const resetAllPageStates = () => {
  hasVisitedPages = {};
  isFirstVisitPages = {};
};

/**
 * Get all visited pages (useful for debugging)
 * @returns {Object} - Object containing all visited page states
 */
export const getAllPageStates = () => {
  return {
    hasVisitedPages: { ...hasVisitedPages },
    isFirstVisitPages: { ...isFirstVisitPages }
  };
};
