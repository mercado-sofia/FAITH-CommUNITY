'use client';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingMessage from './components/FloatingMessage';
import ToastContainer from './components/ToastContainer';
import GlobalLoginModal from './components/GlobalLoginModal';
import '../globals.css';
import Head from 'next/head';
import { useEffect, useRef } from 'react';
import styles from './styles/publicLayout.module.css';
import PagePreloader from '../../components/PagePreloader';

export default function PublicLayout({ children }) {
  const navbarRef = useRef(null);

  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical images
      const criticalImages = [
        '/logo/faith_community_logo.png',
        '/sample/sample2.jpg',
        '/sample/sample8.jpg',
        '/sample/sample3.jpeg'
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

  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/sample/sample4.jpg"
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