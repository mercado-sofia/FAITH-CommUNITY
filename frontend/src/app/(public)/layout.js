'use client';

import { Navbar, Footer, FloatingMessage, ToastContainer, GlobalLoginModal } from './components';
import { Loader, PagePreloader } from '@/components';
import '../globals.css';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from './styles/publicLayout.module.css';
import { usePublicBranding } from './hooks/usePublicData';

export default function PublicLayout({ children }) {
  const navbarRef = useRef(null);
  const [showLogoutLoader, setShowLogoutLoader] = useState(false);
  const { brandingData } = usePublicBranding();

  useEffect(() => {
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
        document.head.appendChild(link);
      });
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
      window.removeEventListener('scroll', throttledScroll);
    };
  }, []);

  // Handle global logout loader
  useEffect(() => {
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
      window.removeEventListener('showLogoutLoader', handleShowLogoutLoader);
      window.removeEventListener('hideLogoutLoader', handleHideLogoutLoader);
    };
  }, []);

  // Show full-page loader during logout
  if (showLogoutLoader) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        {/* Dynamic Favicon */}
        {brandingData?.favicon_url && (
          <link
            rel="icon"
            href={brandingData.favicon_url}
            type="image/x-icon"
          />
        )}
        
        <link
          rel="preload"
          href="/samples/sample4.jpg"
          as="image"
        />
      </Head>
      
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