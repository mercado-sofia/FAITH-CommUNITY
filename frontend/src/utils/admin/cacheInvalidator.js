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
 */
export const invalidateNewsCache = () => {
  const base = API_BASE_URL || '';
  // Invalidate public news cache
  invalidateCache(`${base}/api/news`);
  
  // Invalidate organization-specific news caches
  // We'll invalidate common organization acronyms
  const commonOrgs = ['FACTS', 'FAHSS', 'FABCOMMS', 'FAIEES'];
  commonOrgs.forEach(org => {
    invalidateCache(`${base}/api/news/org/${org}`);
    invalidateCache(`${base}/api/news/approved/${org}`);
  });
  
  // Invalidate admin news caches for all organizations
  commonOrgs.forEach(org => {
    invalidateCache(`${base}/api/news/org/${org}`);
  });
  
  // News cache invalidated
};

/**
 * Invalidate organization-related caches
 */
export const invalidateOrganizationCache = () => {
  const base = API_BASE_URL || '';
  invalidateCache(`${base}/api/organizations`);
  invalidateCache(`${base}/api/organization/org/FACTS`);
  invalidateCache(`${base}/api/organization/org/FAHSS`);
  invalidateCache(`${base}/api/organization/org/FABCOMMS`);
  invalidateCache(`${base}/api/organization/org/FAIEES`);
  
  // Organization cache invalidated
};

/**
 * Invalidate programs-related caches
 */
export const invalidateProgramsCache = () => {
  const base = API_BASE_URL || '';
  invalidateCache(`${base}/api/programs`);
  invalidateCache(`${base}/api/programs/approved/upcoming`);
  
  // Invalidate organization-specific program caches
  const commonOrgs = ['FACTS', 'FAHSS', 'FABCOMMS', 'FAIEES'];
  commonOrgs.forEach(org => {
    invalidateCache(`${base}/api/programs/org/${org}`);
    invalidateCache(`${base}/api/admin/programs/${org}`);
  });
  
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
