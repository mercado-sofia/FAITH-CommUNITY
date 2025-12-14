// Global cache invalidation utility for SWR
import { mutate } from 'swr';
import { API_BASE_URL } from '@/config/api';

/**
 * Invalidate specific SWR cache keys
 * @param {string|string[]} keys - Cache key(s) to invalidate
 */
export const invalidateCache = (keys) => {
  if (Array.isArray(keys)) {
    keys.forEach(key => mutate(key));
  } else {
    mutate(keys);
  }
};

/**
 * Invalidate all news-related caches
 * This ensures both admin and public news views are updated
 * @param {string} orgAcronym - Organization acronym to invalidate specific org caches (required for org-specific invalidation)
 */
export const invalidateNewsCache = (orgAcronym = null) => {
  const base = API_BASE_URL || '';
  // Always invalidate public news cache
  invalidateCache(`${base}/api/news`);
  
  // If orgAcronym is provided, invalidate that specific organization's caches
  if (orgAcronym && typeof orgAcronym === 'string' && orgAcronym.trim() !== '') {
    invalidateCache(`${base}/api/news/org/${orgAcronym}`);
    invalidateCache(`${base}/api/news/approved/${orgAcronym}`);
    // CRITICAL: Also invalidate archived news cache so archive page updates immediately
    invalidateCache(`${base}/api/news/archived/${orgAcronym}`);
  }
  // Note: If orgAcronym is not provided, only public cache is invalidated
  // For org-specific operations, always pass the orgAcronym parameter
  
  // News cache invalidated
};

/**
 * Invalidate organization-related caches
 * @param {string} orgAcronym - Optional organization acronym to invalidate specific org cache
 */
export const invalidateOrganizationCache = (orgAcronym = null) => {
  const base = API_BASE_URL || '';
  // Always invalidate general organizations cache
  invalidateCache(`${base}/api/organizations`);
  
  // If orgAcronym is provided, invalidate that specific organization's cache
  if (orgAcronym && typeof orgAcronym === 'string' && orgAcronym.trim() !== '') {
    invalidateCache(`${base}/api/organization/org/${orgAcronym}`);
  }
  // Note: If orgAcronym is not provided, only general cache is invalidated
  // For org-specific operations, always pass the orgAcronym parameter
  
  // Organization cache invalidated
};

/**
 * Invalidate programs-related caches
 * @param {string} orgAcronym - Optional organization acronym to invalidate specific org caches
 */
export const invalidateProgramsCache = (orgAcronym = null) => {
  const base = API_BASE_URL || '';
  // Always invalidate general program caches
  invalidateCache(`${base}/api/programs`);
  invalidateCache(`${base}/api/programs/approved/upcoming`);
  
  // If orgAcronym is provided, invalidate that specific organization's program caches
  if (orgAcronym && typeof orgAcronym === 'string' && orgAcronym.trim() !== '') {
    invalidateCache(`${base}/api/programs/org/${orgAcronym}`);
    invalidateCache(`${base}/api/admin/programs/${orgAcronym}`);
  }
  // Note: If orgAcronym is not provided, only general caches are invalidated
  // For org-specific operations, always pass the orgAcronym parameter
  
  // Programs cache invalidated
};

/**
 * Invalidate all caches (use sparingly)
 */
export const invalidateAllCaches = () => {
  invalidateNewsCache();
  invalidateOrganizationCache();
  invalidateProgramsCache();
  
  // All caches invalidated
};

const cacheInvalidator = {
  invalidateCache,
  invalidateNewsCache,
  invalidateOrganizationCache,
  invalidateProgramsCache,
  invalidateAllCaches
};

export default cacheInvalidator;