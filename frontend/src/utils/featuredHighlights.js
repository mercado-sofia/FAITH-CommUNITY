/**
 * Utility functions for managing featured highlights
 * Shared between superadmin and public pages
 */

const STARRED_HIGHLIGHTS_KEY = 'superadmin_starred_highlights'
const MAX_FEATURED_HIGHLIGHTS = 12

/**
 * Get starred highlights as ordered array (preserves order)
 * @returns {number[]} Array of highlight IDs in the order they were starred
 */
export const getFeaturedHighlightsOrdered = () => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STARRED_HIGHLIGHTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading featured highlights from localStorage:', error)
    return []
  }
}

/**
 * Get starred highlights as a Set (for quick lookup)
 * @returns {Set<number>} Set of starred highlight IDs
 */
export const getFeaturedHighlightsSet = () => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STARRED_HIGHLIGHTS_KEY)
    if (!stored) return new Set()
    const array = JSON.parse(stored)
    return new Set(Array.isArray(array) ? array : [])
  } catch (error) {
    console.error('Error reading featured highlights from localStorage:', error)
    return new Set()
  }
}

/**
 * Check if a highlight is featured
 * @param {number} highlightId - The highlight ID to check
 * @returns {boolean} True if the highlight is featured
 */
export const isHighlightFeatured = (highlightId) => {
  const featuredSet = getFeaturedHighlightsSet()
  return featuredSet.has(highlightId)
}

/**
 * Get the maximum number of featured highlights allowed
 * @returns {number} Maximum featured highlights (12)
 */
export const getMaxFeaturedHighlights = () => {
  return MAX_FEATURED_HIGHLIGHTS
}

