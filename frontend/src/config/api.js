/**
 * API Configuration
 * Centralized API base URL configuration with production safety checks
 */

const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In production, require the environment variable
  // Note: NEXT_PUBLIC_* variables must be set at build time in Next.js
  if (process.env.NODE_ENV === 'production') {
    if (!apiUrl) {
      // Log error but don't throw to allow app to load
      // API calls will fail, but at least the app won't crash
      console.error(
        '⚠️ CRITICAL: NEXT_PUBLIC_API_URL environment variable is not set in production. ' +
        'Please set it in your deployment configuration before building. ' +
        'API calls will fail until this is fixed. ' +
        'Example: NEXT_PUBLIC_API_URL=https://your-backend.railway.app'
      );
      // Return empty string - API calls will fail but app will load
      // This will cause "Failed to fetch" errors which are now handled better
      return '';
    }
    // Ensure the URL doesn't end with a slash
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // In development, ALWAYS use relative path to leverage Next.js rewrites
  // This makes requests same-origin, allowing cookies to work with SameSite=Lax
  // CRITICAL: Cross-origin requests (localhost:3000 -> localhost:8080) don't send cookies
  // even with credentials: 'include' when SameSite=Lax is used
  // Using Next.js rewrites makes requests same-origin, so cookies work properly
  if (process.env.NODE_ENV === 'development') {
    // Check if Next.js rewrites are configured (they should be in next.config.js)
    // Always use relative path in development to ensure cookies work
    return '';
  }
  
  // Fallback (shouldn't reach here in normal operation)
  const devUrl = apiUrl || 'http://localhost:8080';
  return devUrl.endsWith('/') ? devUrl.slice(0, -1) : devUrl;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function to log errors in production
 * Replace with your error monitoring service (e.g., Sentry)
 */
export const logError = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error monitoring service (e.g., Sentry)
    // Example: Sentry.captureException(error, { extra: context });
    console.error('Error:', error, 'Context:', context);
  } else {
    // In development, log to console
    console.error('Error:', error, 'Context:', context);
  }
};

