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
  const preloadTimeoutRef = useRef(null);

  useEffect(() => {
    // Preload critical pages on mount
    const criticalPages = [
      '/about',
      '/programs', 
      '/faqs',
      '/apply'
    ];

    const preloadPage = async (path) => {
      if (preloadedPages.current.has(path)) return;
      
      try {
        // Preload the page component
        await router.prefetch(path);
        preloadedPages.current.add(path);
      } catch (error) {
        console.warn(`Failed to preload ${path}:`, error);
      }
    };

    // Preload critical pages with staggered timing
    criticalPages.forEach((page, index) => {
      setTimeout(() => preloadPage(page), index * 100);
    });

    // Preload images for critical pages
    const preloadImages = [
      '/sample/sample8.jpg', // About page banner
      '/sample/sample4.jpg', // Programs page
      '/logo/faith_community_logo.png', // Common logo
    ];

    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Cleanup
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [router]);

  // Intersection Observer for lazy preloading based on user scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target;
            const href = link.getAttribute('href');
            
            if (href && !preloadedPages.current.has(href)) {
              // Preload page when link comes into view
              router.prefetch(href);
              preloadedPages.current.add(href);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start preloading 50px before link is visible
        threshold: 0.1,
      }
    );

    // Observe all navigation links
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach((link) => observer.observe(link));

    return () => observer.disconnect();
  }, [router]);

  return null; // This component doesn't render anything
}
