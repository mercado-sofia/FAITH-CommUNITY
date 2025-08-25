'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * PagePreloader component for optimizing navigation performance
 * Preloads critical pages and resources based on user behavior
 */
export default function PagePreloader() {
  const router = useRouter();
  const preloadedPages = useRef(new Set());

  // Preload critical routes + key images on mount
  useEffect(() => {
    const criticalPages = ['/about', '/programs', '/faqs', '/apply'];

    const preloadPage = async (path) => {
      if (preloadedPages.current.has(path)) return;
      try {
        await router.prefetch(path);
        preloadedPages.current.add(path);
      } catch (error) {
        console.warn(`Failed to preload ${path}:`, error);
      }
    };

    // Stagger prefetching; capture timeout IDs locally
    const timeouts = criticalPages.map((page, index) =>
      setTimeout(() => preloadPage(page), index * 100)
    );

    // Preload a few common images
    const preloadImages = [
      '/sample/sample8.jpg', // About page banner
      '/sample/sample4.jpg', // Programs page
      '/logo/faith_community_logo.png', // Common logo
    ];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Cleanup those exact timeouts (no ref dependency)
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [router]);

  // Lazy preloading based on links entering the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = entry.target;
          const href = link.getAttribute('href');
          if (href && href.startsWith('/') && !preloadedPages.current.has(href)) {
            router.prefetch(href);
            preloadedPages.current.add(href);
          }
        });
      },
      {
        rootMargin: '50px', // start preloading a bit before visible
        threshold: 0.1,
      }
    );

    // Observe all client-side nav links
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach((link) => observer.observe(link));

    return () => observer.disconnect();
  }, [router]);

  return null;
}