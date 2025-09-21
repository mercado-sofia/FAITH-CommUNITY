'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from '../../../../hooks/useAuthState';
import { useDropdown } from '../../../../hooks/useDropdown';
import { Logo, NavigationLinks, NotificationsDropdown, ProfileDropdown, LogoutModal, MobileSidebar } from './components';
import styles from './Navbar.module.css';
import { FaBars } from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Dropdowns
  const profileDropdown = useDropdown(false);

  // Apply guard
  const handleApplyClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('showLoginModal'));
    }
  };

  // Sidebar open/close
  const handleCloseSidebar = useCallback(() => {
    setIsSlidingOut(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsSlidingOut(false);
    }, 300);
  }, []);

  const toggleMenu = useCallback(() => {
    if (menuOpen) handleCloseSidebar();
    else setMenuOpen(true);
  }, [menuOpen, handleCloseSidebar]);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      if (window.innerWidth > 1180) setMenuOpen(false);
    }, 100);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [handleResize]);

  // Prefetch on hover (needed for mobile sidebar)
  const handleLinkHover = useCallback(
    (href) => {
      if (href && href !== '/') router.prefetch(href);
    },
    [router]
  );

  const openLogoutModal = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      const userToken = localStorage.getItem('userToken');

      // Best-effort API call
      if (userToken) {
        try {
          await fetch('http://localhost:8080/api/users/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
          });
        } catch {
          // ignore network errors, continue cleanup
        }
      }

      // Client-side cleanup
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');

      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

      setShowLogoutConfirm(false);
      // Force immediate page refresh to ensure clean state
      window.location.reload();
    } catch (e) {
      console.error('Logout error:', e);
      setShowLogoutConfirm(false);
      // Force immediate page refresh even on error
      window.location.reload();
    }
  };


  // Loading state while auth initializes
  if (authLoading) {
    return (
      <div className={styles.navbarWrapper}>
        <nav className={styles.navbar}>
          <div className={styles.loadingNavbar}>
            <div className={styles.loadingSpinner}></div>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className={styles.navbarWrapper}>
      <nav className={styles.navbar}>
        {/* Logo */}
        <Logo />

        {/* Navigation Links */}
        <NavigationLinks />

        {/* Right Actions */}
        <div className={styles.rightActions}>
          <a
            href="https://www.firstasia.edu.ph/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.faithBtn}
          >
            <Image
              src="/logo/faith_logo.png"
              alt="FAITH Logo"
              width={18}
              height={18}
            />
            <span>Go To FAITH Colleges</span>
          </a>
          
          {isAuthenticated ? (
            <>
              <Link 
                href="/apply" 
                className={styles.applyBtn}
                onMouseEnter={() => handleLinkHover('/apply')}
                onClick={handleApplyClick}
              >
                Apply
              </Link>

              {/* Notification Icon */}
              <NotificationsDropdown 
                isAuthenticated={isAuthenticated} 
                profileDropdown={profileDropdown} 
              />

              {/* Profile Icon */}
              <ProfileDropdown 
                user={user} 
                isAuthenticated={isAuthenticated} 
                onLogoutClick={openLogoutModal} 
              />
            </>
          ) : (
            // Not logged in
            <>
              <Link href="/login" className={styles.navbarLoginBtn}>
                Log In or Sign Up
              </Link>
              <Link 
                href="/apply" 
                className={styles.applyBtn}
                onMouseEnter={() => handleLinkHover('/apply')}
                onClick={handleApplyClick}
              >
                Apply
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button className={styles.hamburgerBtn} onClick={toggleMenu}>
            <FaBars />
          </button>
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar 
          menuOpen={menuOpen}
          isSlidingOut={isSlidingOut}
          toggleMenu={toggleMenu}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogoutClick={openLogoutModal}
          handleApplyClick={handleApplyClick}
          handleLinkHover={handleLinkHover}
        />
      </nav>

      {/* ===== Logout Confirmation Modal ===== */}
      <LogoutModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        isMounted={isMounted}
      />
    </div>
  );
}