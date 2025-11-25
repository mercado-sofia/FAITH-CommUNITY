'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from '@/hooks/useAuthState';
import { logout, USER_TYPES } from '@/utils/authService';
import { useDropdown } from '@/hooks/useDropdown';
import { storeRedirectUrl } from '@/utils/redirectUtils';
import { Logo, NavigationLinks, NotificationsDropdown, ProfileDropdown, LogoutModal, MobileSidebar } from './components';
import styles from './Navbar.module.css';
import { FaBars } from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const sidebarTimeoutRef = useRef(null);

  // Dropdowns
  const profileDropdown = useDropdown(false);

  // Apply handler - always navigate to /apply, show modal if not authenticated
  const handleApplyClick = (e) => {
    if (!isAuthenticated) {
      // Store redirect URL before navigating
      storeRedirectUrl("/apply");
      // Still navigate to /apply page, but show modal
      if (typeof window !== 'undefined') {
        // Use setTimeout to ensure modal shows after navigation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('showLoginModal', {
            detail: { redirectUrl: "/apply" }
          }));
        }, 100);
      }
      // Don't prevent default - let the Link navigate to /apply
    }
  };

  // Sidebar open/close
  const handleCloseSidebar = useCallback(() => {
    // Clear any existing timeout
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }

    setIsSlidingOut(true);
    // Only run on client side
    if (typeof window !== 'undefined') {
      sidebarTimeoutRef.current = setTimeout(() => {
        setMenuOpen(false);
        setIsSlidingOut(false);
        sidebarTimeoutRef.current = null;
      }, 300);
    }
  }, []);

  const toggleMenu = useCallback(() => {
    if (menuOpen) handleCloseSidebar();
    else setMenuOpen(true);
  }, [menuOpen, handleCloseSidebar]);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth > 1180) {
        setMenuOpen(false);
      }
    }, 100);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
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
    setShowLogoutConfirm(false);
    
    // Use centralized logout service
    await logout(USER_TYPES.PUBLIC, {
      showLoader: true,
      redirect: true,
      redirectPath: '/'
    });
  };


  // No loading state - navbar renders immediately
  // Auth loading is handled by page-level loaders

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
              src="/assets/logos/faith_logo.png"
              alt="FAITH Logo"
              width={18}
              height={18}
            />
            <span>Go To FAITH Colleges</span>
          </a>
          
          {/* Only show user UI for regular users (not admin/superadmin) */}
          {isAuthenticated && user && user.role?.toLowerCase() === 'user' ? (
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