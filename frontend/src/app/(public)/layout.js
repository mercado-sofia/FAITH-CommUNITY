'use client';

import { Navbar, Footer, FloatingMessage, ToastContainer, GlobalLoginModal } from './components';
import { Loader, PagePreloader, DynamicFavicon } from '@/components';
import '../globals.css';
import { useEffect, useRef, useState } from 'react';
import styles from './styles/publicLayout.module.css';

export default function PublicLayout({ children }) {
  const navbarRef = useRef(null);
  const [showLogoutLoader, setShowLogoutLoader] = useState(false);

  useEffect(() => {
    // Check for window and document to avoid SSR errors
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical images
      const criticalImages = [
        '/assets/icons/placeholder.svg',
        '/samples/sample2.jpg',
        '/samples/sample8.jpg',
        '/samples/sample3.jpeg'
      ];

      criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        if (document.head) {
          document.head.appendChild(link);
        }
      });
      
      // Preload sample4.jpg
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.href = '/samples/sample4.jpg';
      preloadLink.as = 'image';
      if (document.head) {
        document.head.appendChild(preloadLink);
      }
    };

    preloadCriticalResources();

    // Optimized scroll behavior
    const handleScroll = () => {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        // Add scroll-based optimizations here if needed
      });
    };

    // Throttled scroll listener
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', throttledScroll);
      }
    };
  }, []);

  // Handle global logout loader
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      return;
    }

    const handleShowLogoutLoader = () => {
      setShowLogoutLoader(true);
    };

    const handleHideLogoutLoader = () => {
      setShowLogoutLoader(false);
    };

    // Listen for custom events to show/hide logout loader
    window.addEventListener('showLogoutLoader', handleShowLogoutLoader);
    window.addEventListener('hideLogoutLoader', handleHideLogoutLoader);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('showLogoutLoader', handleShowLogoutLoader);
        window.removeEventListener('hideLogoutLoader', handleHideLogoutLoader);
      }
    };
  }, []);

  // Show full-page loader during logout
  if (showLogoutLoader) {
    return <Loader />;
  }

  return (
    <>
      {/* Dynamic Favicon - uses client-side DOM manipulation for App Router */}
      <DynamicFavicon />
      
      {/* Page preloader for instant navigation */}
      <PagePreloader />
      
      {/* Optimized layout container */}
      <div className={styles['public-layout-container']}>
        {/* Fixed navbar */}
        <div ref={navbarRef} className={styles['public-navbar-wrapper']}>
          <Navbar />
        </div>
        
        {/* Optimized content container */}
        <div className={styles['public-content-container']}>
          <main className={styles['public-main-content']}>{children}</main>
          <Footer />
        </div>
        
        {/* Floating message - positioned at viewport level */}
        <FloatingMessage />
        
        {/* Global toast container */}
        <ToastContainer />
        
        {/* Global login modal */}
        <GlobalLoginModal />
      </div>
    </>
  );
}