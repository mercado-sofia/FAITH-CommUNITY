import {
  isForceFallback,
  markFallbackUsed,
  shouldFallbackOnError,
  shouldFallbackOnFetchResponse,
} from '@/config/fallback';
import { resolveFallbackSwr } from '@/data';
import logger from '@/utils/shared/logger';

/**
 * SWR fetcher with public demo fallback support.
 */
export async function swrFetcherWithFallback(url) {
  if (isForceFallback()) {
    const forced = resolveFallbackSwr(url, { method: 'GET' });
    if (forced !== null) {
      markFallbackUsed();
      return forced;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorData = null;
      let errorText = '';
      try {
        const clonedResponse = response.clone();
        errorText = await clonedResponse.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText, raw: errorText };
          }
        }
      } catch (textError) {
        console.warn('[FETCHER] Could not read error response text:', textError);
      }

      if (shouldFallbackOnFetchResponse(response)) {
        const fallback = resolveFallbackSwr(url, { method: 'GET' });
        if (fallback !== null) {
          markFallbackUsed();
          return fallback;
        }
      }

      const status = response.status;
      const statusText = response.statusText || 'Unknown';
      const errorMessage =
        errorData?.message || errorData?.error || errorData?.raw || `HTTP ${status}: ${statusText}`;

      if (process.env.NODE_ENV === 'development') {
        console.error(`[FETCHER] Response not OK for ${url}:`, {
          status: String(status),
          statusText: String(statusText),
          errorText: errorText || '(empty)',
          errorData: errorData || null,
          hasHeaders: !!response.headers,
        });
      }

      const error = new Error(errorMessage);
      error.status = status;
      error.statusText = statusText;
      error.data = errorData;
      error.responseText = errorText;
      error._alreadyLogged = true;

      logger.apiError(url, error, {
        status: String(status),
        statusText: String(statusText),
        errorData: errorData || null,
        responseText: errorText || '(empty)',
      });
      throw error;
    }

    try {
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!text || text.trim() === '') {
        if (url.includes('/api/news')) {
          return [];
        }
        return null;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (contentType.includes('application/json')) {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
        return text;
      }

      if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
        return data.data;
      }
      return data;
    } catch (parseError) {
      const error = new Error(`Invalid JSON response from server: ${parseError.message}`);
      error.originalError = parseError;
      error.status = response.status;
      error.statusText = response.statusText;
      error._alreadyLogged = true;
      logger.apiError(url, error, {
        parseError: parseError.message,
        status: response.status,
        statusText: response.statusText,
      });
      throw error;
    }
  } catch (error) {
    if (error._alreadyLogged) {
      const fallback = resolveFallbackSwr(url, { method: 'GET' });
      if (fallback !== null) {
        markFallbackUsed();
        return fallback;
      }
      throw error;
    }

    if (
      error instanceof TypeError ||
      error.name === 'NetworkError' ||
      (error.message &&
        (error.message.includes('fetch') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')))
    ) {
      const fallback = resolveFallbackSwr(url, { method: 'GET' });
      if (fallback !== null) {
        markFallbackUsed();
        return fallback;
      }

      const networkError = new Error(`Network error: Unable to connect to ${url}`);
      networkError.originalError = error;
      networkError.isNetworkError = true;
      networkError.name = error.name || 'NetworkError';
      networkError.message = error.message || networkError.message;
      networkError._alreadyLogged = true;
      logger.warn(`Failed to fetch from ${url}: ${networkError.message}`, {
        endpoint: url,
        type: 'network_error',
        originalError: error.message || error.toString(),
      });
      throw networkError;
    }

    if (shouldFallbackOnError(error)) {
      const fallback = resolveFallbackSwr(url, { method: 'GET' });
      if (fallback !== null) {
        markFallbackUsed();
        return fallback;
      }
    }

    const errorWithMessage =
      error instanceof Error ? error : new Error(error?.toString() || 'Unknown error occurred');
    if (!errorWithMessage.message) {
      errorWithMessage.message = error?.toString() || 'Unknown error occurred';
    }
    logger.apiError(url, errorWithMessage, {
      originalError: error,
      errorType: typeof error,
    });
    throw errorWithMessage;
  }
}
