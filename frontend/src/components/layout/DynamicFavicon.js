'use client';

import { useEffect } from 'react';
import { usePublicBranding } from '@/app/(public)/hooks/usePublicData';

/**
 * DynamicFavicon component that updates the favicon based on branding data
 * This component works with Next.js App Router by directly manipulating the DOM
 */
export default function DynamicFavicon() {
  const { brandingData, isLoading } = usePublicBranding();

  useEffect(() => {
    if (isLoading) return;

    // Remove existing favicon links
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(link => link.remove());

    // Create new favicon link
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/x-icon';
    
    if (brandingData?.favicon_url) {
      faviconLink.href = brandingData.favicon_url;
    } else {
      // Fallback to default favicon
      faviconLink.href = '/assets/icons/favicon.ico';
    }

    // Add to document head
    document.head.appendChild(faviconLink);

    // Also add apple-touch-icon for better mobile support
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = brandingData?.favicon_url || '/assets/icons/favicon.ico';
    document.head.appendChild(appleTouchIcon);

    // Cleanup function
    return () => {
      faviconLink.remove();
      appleTouchIcon.remove();
    };
  }, [brandingData, isLoading]);

  // This component doesn't render anything
  return null;
}
