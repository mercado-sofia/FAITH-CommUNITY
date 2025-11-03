'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import logger from '../../utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Simple fetcher for public branding API
const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * DynamicFavicon component that updates the favicon based on branding data
 * Works across all portals (public, admin, superadmin) using the public branding API
 * Optimized to only update when favicon actually changes to prevent navigation delays
 */
export default function DynamicFavicon() {
  // Use SWR directly with optimized settings to prevent navigation delays
  const { data, isLoading } = useSWR(
    `${API_BASE_URL}/api/superadmin/branding/public`,
    fetcher,
    {
      dedupingInterval: 300000, // Cache for 5 minutes (branding doesn't change often)
      revalidateOnFocus: false, // Don't revalidate on window focus
      revalidateOnReconnect: false, // Don't revalidate on reconnect
      revalidateIfStale: false, // Don't revalidate if stale
      onError: (error) => {
        logger.swrError(`${API_BASE_URL}/api/superadmin/branding/public`, error);
      }
    }
  );

  const previousFaviconUrl = useRef(null);
  const faviconElements = useRef({ icon: null, appleTouch: null });
  const isUpdating = useRef(false);

  useEffect(() => {
    // Don't do anything while loading or if already updating
    if (isLoading || isUpdating.current) return;

    const faviconUrl = data?.data?.favicon_url;
    const currentFaviconUrl = faviconUrl || '/assets/icons/favicon.ico';
    
    // Only update if favicon URL actually changed
    if (previousFaviconUrl.current === currentFaviconUrl) {
      return;
    }

    // Store previous URL and set updating flag
    previousFaviconUrl.current = currentFaviconUrl;
    isUpdating.current = true;

    // Use setTimeout with 0 delay to defer DOM updates after navigation completes
    // This ensures navigation is not blocked
    const updateTimer = setTimeout(() => {
      try {
        // Remove only the favicon links we created, not all icon links
        // This prevents interfering with other icon links
        if (faviconElements.current.icon && faviconElements.current.icon.parentNode) {
          faviconElements.current.icon.remove();
        }
        if (faviconElements.current.appleTouch && faviconElements.current.appleTouch.parentNode) {
          faviconElements.current.appleTouch.remove();
        }

        // Create new favicon link
        const faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/x-icon';
        faviconLink.href = currentFaviconUrl;
        faviconElements.current.icon = faviconLink;

        // Also add apple-touch-icon for better mobile support
        const appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = currentFaviconUrl;
        faviconElements.current.appleTouch = appleTouchIcon;

        // Add to document head
        document.head.appendChild(faviconLink);
        document.head.appendChild(appleTouchIcon);
      } catch (error) {
        // Silently fail if DOM manipulation fails (e.g., during navigation)
        console.warn('Failed to update favicon:', error);
      } finally {
        isUpdating.current = false;
      }
    }, 0);

    // Cleanup
    return () => {
      clearTimeout(updateTimer);
      isUpdating.current = false;
    };
  }, [data?.data?.favicon_url, isLoading]);

  // This component doesn't render anything
  return null;
}
