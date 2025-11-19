"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { getStoredRedirectUrl } from '@/utils/redirectUtils';
import styles from './GlobalLoginModal.module.css';

export default function GlobalLoginModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const handleShowModal = (event) => {
      // Get redirect URL from event detail or sessionStorage
      const url = event?.detail?.redirectUrl || getStoredRedirectUrl() || null;
      setRedirectUrl(url);
      setIsOpen(true);
    };

    // Listen for custom event to show modal
    window.addEventListener('showLoginModal', handleShowModal);

    return () => {
      window.removeEventListener('showLoginModal', handleShowModal);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      if (isOpen) {
        setIsVisible(true);
        document.body.style.overflow = 'hidden';
      } else {
        setIsVisible(false);
        document.body.style.overflow = 'auto';
      }

      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen]);

  // Helper function to get redirect URL
  const getRedirectUrl = () => {
    return redirectUrl || getStoredRedirectUrl() || null;
  };

  const handleLogin = () => {
    // Pass redirect URL to login page
    const url = getRedirectUrl();
    if (url) {
      router.push(`/login?redirect=${encodeURIComponent(url)}`);
    } else {
      router.push('/login');
    }
  };

  const handleSignup = () => {
    // Pass redirect URL to signup page
    const url = getRedirectUrl();
    if (url) {
      router.push(`/signup?redirect=${encodeURIComponent(url)}`);
    } else {
      router.push('/signup');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={`${styles.modalOverlay} ${isVisible ? styles.show : ''}`} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
        
        <div className={styles.modalHeader}>
          <h2>Login Required</h2>
          <p>To apply for volunteer programs, you need to create an account or log in first.</p>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.benefits}>
            <h3>Benefits of creating an account:</h3>
            <ul>
              <li>Simplified application process</li>
              <li>Track your applications</li>
              <li>Receive updates on your status</li>
              <li>Access to exclusive volunteer opportunities</li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleLogin}
          >
            Log In
          </button>
          <button 
            className={`${styles.button} ${styles.signupButton}`}
            onClick={handleSignup}
          >
            Sign Up
          </button>
          <button 
            className={`${styles.button} ${styles.textButton}`}
            onClick={handleClose}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );

  // Ensure document.body exists before creating portal (SSR safety)
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }

  // Fallback for SSR or if document.body doesn't exist
  return null;
}
