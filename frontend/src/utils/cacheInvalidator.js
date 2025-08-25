// Global cache invalidation utility for SWR
import { mutate } from 'swr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
  // Invalidate public news cache
  invalidateCache(`${API_BASE_URL}/api/news`);
  
  // Invalidate organization-specific news caches
  // We'll invalidate common organization acronyms
  const commonOrgs = ['FACTS', 'FAHSS', 'FABCOMMS', 'FAIEES'];
  commonOrgs.forEach(org => {
    invalidateCache(`${API_BASE_URL}/api/news/org/${org}`);
    invalidateCache(`${API_BASE_URL}/api/news/approved/${org}`);
  });
  
  // Invalidate admin news caches for all organizations
  commonOrgs.forEach(org => {
    invalidateCache(`${API_BASE_URL}/api/news/org/${org}`);
  });
  
  console.log('🗑️ News cache invalidated');
};

/**
 * Invalidate organization-related caches
 */
export const invalidateOrganizationCache = () => {
  invalidateCache(`${API_BASE_URL}/api/organizations`);
  invalidateCache(`${API_BASE_URL}/api/organization/org/FACTS`);
  invalidateCache(`${API_BASE_URL}/api/organization/org/FAHSS`);
  invalidateCache(`${API_BASE_URL}/api/organization/org/FABCOMMS`);
  invalidateCache(`${API_BASE_URL}/api/organization/org/FAIEES`);
  
  console.log('🏢 Organization cache invalidated');
};

/**
 * Invalidate programs-related caches
 */
export const invalidateProgramsCache = () => {
  invalidateCache(`${API_BASE_URL}/api/programs`);
  invalidateCache(`${API_BASE_URL}/api/programs/approved/upcoming`);
  
  // Invalidate organization-specific program caches
  const commonOrgs = ['FACTS', 'FAHSS', 'FABCOMMS', 'FAIEES'];
  commonOrgs.forEach(org => {
    invalidateCache(`${API_BASE_URL}/api/programs/org/${org}`);
    invalidateCache(`${API_BASE_URL}/api/admin/programs/${org}`);
  });
  
  console.log('📚 Programs cache invalidated');
};

/**
 * Invalidate all caches (use sparingly)
 */
export const invalidateAllCaches = () => {
  invalidateNewsCache();
  invalidateOrganizationCache();
  invalidateProgramsCache();
  
  console.log('🔄 All caches invalidated');
};

const cacheInvalidator = {
  invalidateCache,
  invalidateNewsCache,
  invalidateOrganizationCache,
  invalidateProgramsCache,
  invalidateAllCaches
};

export default cacheInvalidator;