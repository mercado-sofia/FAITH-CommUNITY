import {
  isForceFallback,
  markFallbackUsed,
  shouldFallbackOnError,
  shouldFallbackOnFetchResponse,
} from '@/config/fallback';
import { resolveFallbackApi } from '@/data';

/**
 * GET fetch for public endpoints with optional static fallback (JSON body).
 */
export async function fetchPublicWithFallback(url, fetchOptions = {}) {
  const method = (fetchOptions.method || 'GET').toUpperCase();

  if (method === 'GET' && isForceFallback()) {
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
      if (method === 'GET' && shouldFallbackOnFetchResponse(response)) {
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
    if (method === 'GET' && shouldFallbackOnError(error)) {
      const fallback = resolveFallbackApi(url, { method });
      if (fallback !== null) {
        markFallbackUsed();
        return fallback;
      }
    }
    throw error;
  }
}
