/**
 * Public-site fallback configuration for live demo when the API is unavailable.
 */

const FALLBACK_SESSION_KEY = 'fallbackActive';
let fallbackLoggedThisSession = false;

export const isForceFallback = () =>
  process.env.NEXT_PUBLIC_USE_FALLBACK_DATA === 'true';

export const shouldFallbackOnError = (error) => {
  if (!error) return false;

  const status = error.status ?? error.originalStatus;

  if (status === 401 || status === 403 || status === 404) {
    return false;
  }

  if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR' || status === 'TIMEOUT_ERROR') {
    return true;
  }

  if (typeof status === 'number' && status >= 500) {
    return true;
  }

  if (
    error.isNetworkError === true ||
    error.name === 'NetworkError' ||
    (error.message &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('Network error') ||
        error.message.includes('Unable to connect')))
  ) {
    return true;
  }

  return false;
};

export const shouldFallbackOnFetchResponse = (response) => {
  if (!response || response.ok) return false;
  const status = response.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return status >= 500;
};

export const markFallbackUsed = () => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FALLBACK_SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }

  if (!fallbackLoggedThisSession && process.env.NODE_ENV !== 'production') {
    fallbackLoggedThisSession = true;
    console.warn('[fallback] Serving static demo data — API unavailable or demo mode enabled.');
  }
};

export const isFallbackBannerActive = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(FALLBACK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearFallbackBannerFlag = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(FALLBACK_SESSION_KEY);
  } catch {
    // ignore
  }
};
