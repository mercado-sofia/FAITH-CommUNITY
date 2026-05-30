'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import logger from '@/utils/shared/logger';
import { API_BASE_URL } from '@/config/api';
import { swrFetcherWithFallback } from '@/utils/shared/swrFetcherWithFallback';
import { FALLBACK_FAVICON_URL } from '@/utils/shared/brandingDefaults';

function resolveFaviconHref(faviconUrl) {
  if (faviconUrl && typeof faviconUrl === 'string' && faviconUrl.trim() !== '') {
    return faviconUrl.trim();
  }
  return FALLBACK_FAVICON_URL;
}

function faviconMimeType(url) {
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.svg')) return 'image/svg+xml';
  return 'image/x-icon';
}

/**
 * DynamicFavicon component that updates the favicon based on branding data
 * Works across all portals (public, admin, superadmin) using the public branding API
 * Optimized to only update when favicon actually changes to prevent navigation delays
 */
export default function DynamicFavicon() {
  const { data, isLoading } = useSWR(
    `${API_BASE_URL || ''}/api/superadmin/branding/public`,
    swrFetcherWithFallback,
    {
      dedupingInterval: 300000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      onError: (error) => {
        if (error.isNetworkError) {
          logger.warn(`Failed to fetch branding data: ${error.message}`, {
            endpoint: `${API_BASE_URL}/api/superadmin/branding/public`,
            type: 'network_error',
          });
        } else {
          logger.swrError(`${API_BASE_URL}/api/superadmin/branding/public`, error);
        }
      },
    }
  );

  const previousFaviconUrl = useRef(null);
  const faviconElements = useRef({ icon: null, appleTouch: null });
  const isUpdating = useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.head) {
      return;
    }

    if (isLoading || isUpdating.current) return;

    const currentFaviconUrl = resolveFaviconHref(data?.favicon_url);

    if (previousFaviconUrl.current === currentFaviconUrl) {
      return;
    }

    previousFaviconUrl.current = currentFaviconUrl;
    isUpdating.current = true;

    const updateTimer = setTimeout(() => {
      try {
        if (typeof document === 'undefined' || !document.head) {
          isUpdating.current = false;
          return;
        }

        if (faviconElements.current.icon && faviconElements.current.icon.parentNode) {
          faviconElements.current.icon.remove();
        }
        if (faviconElements.current.appleTouch && faviconElements.current.appleTouch.parentNode) {
          faviconElements.current.appleTouch.remove();
        }

        const mime = faviconMimeType(currentFaviconUrl);

        const faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = mime;
        faviconLink.href = currentFaviconUrl;
        faviconElements.current.icon = faviconLink;

        const appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = currentFaviconUrl;
        faviconElements.current.appleTouch = appleTouchIcon;

        document.head.appendChild(faviconLink);
        document.head.appendChild(appleTouchIcon);
      } catch (error) {
        console.warn('Failed to update favicon:', error);
      } finally {
        isUpdating.current = false;
      }
    }, 0);

    return () => {
      clearTimeout(updateTimer);
      isUpdating.current = false;
    };
  }, [data?.favicon_url, isLoading]);

  return null;
}
