'use client';

import { Navbar, Footer, FloatingMessage, ToastContainer, GlobalLoginModal } from './components';
import { Loader, PagePreloader } from '@/components';
import '../globals.css';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from './styles/publicLayout.module.css';
import { Poppins, Inter } from 'next/font/google';
import { usePublicBranding } from './hooks/usePublicData';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export default function PublicLayout({ children }) {
  const navbarRef = useRef(null);
  const [showLogoutLoader, setShowLogoutLoader] = useState(false);
  const { brandingData } = usePublicBranding();

  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical images
      const criticalImages = [
        '/assets/logos/faith_community_logo.png',
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
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      
      {/* Page preloader for instant navigation */}
      <PagePreloader />
      
      {/* Optimized layout container */}
      <div className={`${styles['public-layout-container']} ${poppins.variable} ${inter.variable}`}>
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