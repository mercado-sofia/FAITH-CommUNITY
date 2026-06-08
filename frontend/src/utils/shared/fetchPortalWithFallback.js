import {
  isForceFallback,
  markFallbackUsed,
  shouldFallbackOnError,
  shouldFallbackOnFetchResponse,
} from '@/config/fallback';
import {
  assertNotDemoMutation,
  isPortalDemoActive,
} from '@/config/portalDemo';
import { resolveFallbackApi } from '@/data';

function shouldUsePortalFallback() {
  return isPortalDemoActive() || isForceFallback();
}

/**
 * Authenticated portal fetch with demo/fallback support for GET requests.
 * Returns parsed JSON body (same shape as resolveFallbackApi for demo data).
 */
export async function fetchPortalWithFallback(url, fetchOptions = {}) {
  const method = (fetchOptions.method || 'GET').toUpperCase();

  assertNotDemoMutation(method);

  if (method === 'GET' && shouldUsePortalFallback()) {
    const forced = resolveFallbackApi(url, { method });
    if (forced !== null) {
      markFallbackUsed();
      return forced;
    }
  }

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
      ...fetchOptions,
      method,
    });

    if (!response.ok) {
      if (method === 'GET' && (shouldUsePortalFallback() || shouldFallbackOnFetchResponse(response))) {
        const fallback = resolveFallbackApi(url, { method });
        if (fallback !== null) {
          markFallbackUsed();
          return fallback;
        }
      }
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    const text = await response.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch (error) {
    if (method === 'GET' && (shouldUsePortalFallback() || shouldFallbackOnError(error))) {
      const fallback = resolveFallbackApi(url, { method });
      if (fallback !== null) {
        markFallbackUsed();
        return fallback;
      }
    }
    throw error;
  }
}

/**
 * SWR-compatible portal fetcher — returns full API body (e.g. { success, data }).
 */
export async function portalSwrFetcher(url) {
  return fetchPortalWithFallback(url, { method: 'GET' });
}
