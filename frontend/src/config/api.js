/**
 * API Configuration
 * Centralized API base URL configuration with production safety checks
 */

const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In production, require the environment variable
  if (process.env.NODE_ENV === 'production') {
    if (!apiUrl) {
      throw new Error(
        'NEXT_PUBLIC_API_URL environment variable is required in production. ' +
        'Please set it in your deployment configuration.'
      );
    }
    return apiUrl;
  }
  
  // In development, fallback to localhost
  return apiUrl || 'http://localhost:8080';
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

