/**
 * Admin Constants
 * Centralized constants to avoid magic numbers and hardcoded values
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  TIMEOUT: 30000, // 30 seconds
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRIES: 3
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100
};

// Rate Limiting
export const RATE_LIMITS = {
  STATUS_UPDATE: { maxCalls: 10, windowMs: 60000 }, // 10 calls per minute
  DELETE: { maxCalls: 5, windowMs: 60000 }, // 5 calls per minute
  SEARCH: { maxCalls: 20, windowMs: 1000 } // 20 calls per second
};

// Debounce Delays
export const DEBOUNCE_DELAYS = {
  SEARCH: 300, // 300ms
  VALIDATION: 500, // 500ms
  AUTO_SAVE: 2000 // 2 seconds
};

// Timeouts
export const TIMEOUTS = {
  TOAST_AUTO_HIDE: 3000, // 3 seconds
  SUCCESS_MODAL: 4000, // 4 seconds
  ERROR_MODAL: 5000, // 5 seconds
  SKELETON_DELAY: 300, // 300ms
  INITIAL_LOAD_DELAY: 800 // 800ms
};

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_ADDITIONAL_IMAGES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_TITLE_LENGTH: 100,
  MIN_TITLE_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2
};

// Status Values
export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

// Cache Durations (in milliseconds)
export const CACHE_DURATIONS = {
  SHORT: 30000, // 30 seconds
  MEDIUM: 120000, // 2 minutes
  LONG: 300000, // 5 minutes
  VERY_LONG: 600000 // 10 minutes
};

// Search Configuration
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  TRUNCATE_LENGTH: 100
};

