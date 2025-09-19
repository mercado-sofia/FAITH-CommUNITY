'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from '../../../hooks/useAuthState';
import { useNotifications } from '../../../hooks/useNotifications';
import { useDropdown } from '../../../hooks/useDropdown';
import OptimizedImage from '../../../components/OptimizedImage';
import styles from './styles/navbar.module.css';
import { FaBars, FaChevronRight, FaUser, FaSignOutAlt, FaBell, FaCog, FaClipboardList } from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Dropdowns + notifications
  const profileDropdown = useDropdown(false);
  const notificationsDropdown = useDropdown(false);
  const notifications = useNotifications(isAuthenticated);

  // Ensure only one dropdown is open at a time
  const handleProfileToggle = () => {
    if (notificationsDropdown.isOpen) {
      notificationsDropdown.close();
    }
    profileDropdown.toggle();
  };

  const handleNotificationsToggle = () => {
    if (profileDropdown.isOpen) {
      profileDropdown.close();
    }
    notificationsDropdown.toggle();
  };

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

  // Prefetch on hover
  const handleLinkHover = useCallback(
    (href) => {
      if (href && href !== '/') router.prefetch(href);
    },
    [router]
  );

  // Check if link is active
  const isLinkActive = useCallback((href) => {
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/faithree') {
      return pathname.includes('faithree');
    }
    return pathname.startsWith(href);
  }, [pathname]);

  // ===== Logout Modal helpers =====
  useEffect(() => {
    if (!showLogoutConfirm) return;
    const onKey = (e) => e.key === 'Escape' && setShowLogoutConfirm(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showLogoutConfirm]);

  const openLogoutModal = () => {
    setShowLogoutConfirm(true);
    profileDropdown.close();
    notificationsDropdown.close();
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

  const handleOverlayClick = () => setShowLogoutConfirm(false);
  const stop = (e) => e.stopPropagation();

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
        <Link href="/" className={styles.logoContainer}>
          <Image
            src="/logo/faith_community_logo.png"
            alt="FAITH CommUNITY Logo"
            width={45}
            height={46}
            priority
          />
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoTop}>FAITH</span>
            <span className={styles.logoBottom}>
              Comm<strong className={styles.orange}>UNITY</strong>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          <Link 
            href="/" 
            className={`${styles.navLink} ${isLinkActive('/') ? styles.active : ''}`}
            onMouseEnter={() => handleLinkHover('/')}
          >
            Home
          </Link>
          <Link 
            href="/about" 
            className={`${styles.navLink} ${isLinkActive('/about') ? styles.active : ''}`}
            onMouseEnter={() => handleLinkHover('/about')}
          >
            About Us
          </Link>
          <Link 
            href="/programs" 
            className={`${styles.navLink} ${isLinkActive('/programs') ? styles.active : ''}`}
            onMouseEnter={() => handleLinkHover('/programs')}
          >
            Programs and Services
          </Link>
          <Link 
            href="/faithree" 
            className={`${styles.navLink} ${isLinkActive('/faithree') ? styles.active : ''}`}
            onMouseEnter={() => handleLinkHover('/faithree')}
          >
            FAIThree
          </Link>
          <Link 
            href="/faqs" 
            className={`${styles.navLink} ${isLinkActive('/faqs') ? styles.active : ''}`}
            onMouseEnter={() => handleLinkHover('/faqs')}
          >
            FAQs
          </Link>
        </div>

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
              <div className={styles.notificationWrapper} ref={notificationsDropdown.ref}>
                <button 
                  className={styles.notificationBtn}
                  onClick={handleNotificationsToggle}
                >
                  <FaBell />
                  {notifications.hasUnreadNotifications && (
                    <span className={styles.notificationBadge}></span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {notificationsDropdown.isOpen && (
                  <div className={styles.notificationsDropdown}>
                    <div className={styles.notificationsHeader}>
                      <h3>Notifications</h3>
                    </div>
                    <div className={styles.notificationsList}>
                      {notifications.isLoading ? (
                        <div className={styles.notificationItem}>
                          <div className={styles.notificationContent}>
                            <p className={styles.notificationText}>Loading notifications...</p>
                          </div>
                        </div>
                      ) : notifications.notifications.length === 0 ? (
                        <div className={styles.notificationItem}>
                          <div className={styles.notificationContent}>
                            <p className={styles.notificationText}>No notifications yet</p>
                          </div>
                        </div>
                      ) : (
                        notifications.notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                            onClick={() => notifications.handleNotificationClick(notification)}
                          >
                            <div className={styles.notificationContent}>
                              <p className={styles.notificationText}>{notification.title}</p>
                              <p className={styles.notificationMessage}>{notification.message}</p>
                              <span className={styles.notificationTime}>
                                {notifications.formatNotificationTime(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className={styles.notificationsFooter}>
                      <Link 
                        href="/profile?tab=notifications" 
                        className={styles.viewAllBtn}
                        onClick={notificationsDropdown.close}
                      >
                        View All
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Icon */}
              <div className={`${styles.profileWrapper} ${profileDropdown.isOpen ? styles.open : ''}`} ref={profileDropdown.ref}>
                <button 
                  className={styles.profileBtn}
                  onClick={handleProfileToggle}
                >
                  <div className={styles.profileIcon}>
                    {user?.profile_photo_url ? (
                      <OptimizedImage
                        src={`http://localhost:8080${user.profile_photo_url}`}
                        alt="Profile"
                        width={32}
                        height={32}
                        className={styles.profileImage}
                        fallbackIcon={FaUser}
                      />
                    ) : (
                      <FaUser className={styles.profileIconDefault} />
                    )}
                  </div>
                  <FaChevronRight className={styles.chevronIcon} />
                </button>
                
                {/* Profile Dropdown */}
                {profileDropdown.isOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileDropdownHeader}>
                      <div className={styles.dropdownProfileIcon}>
                        {user?.profile_photo_url ? (
                          <OptimizedImage
                            src={`http://localhost:8080${user.profile_photo_url}`}
                            alt="Profile"
                            width={40}
                            height={40}
                            className={styles.dropdownProfileImage}
                            fallbackIcon={FaUser}
                          />
                        ) : (
                          <FaUser className={styles.dropdownProfileIconDefault} />
                        )}
                      </div>
                      <div className={styles.dropdownUserInfo}>
                        <p className={styles.dropdownUserName}>
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className={styles.dropdownUserEmail}>{user?.email}</p>
                      </div>
                    </div>
                    <Link 
                      href="/profile" 
                      className={styles.profileDropdownItem}
                      onClick={profileDropdown.close}
                    >
                      <FaCog />
                      <span>Manage Account</span>
                    </Link>
                    <Link 
                      href="/profile?tab=applications" 
                      className={styles.profileDropdownItem}
                      onClick={profileDropdown.close}
                    >
                      <FaClipboardList />
                      <span>My Applications</span>
                    </Link>
                    <button 
                      className={styles.profileDropdownItem}
                      onClick={openLogoutModal}
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
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
        {menuOpen && (
          <div className={`${styles.mobileSidebar} ${isSlidingOut ? styles.slideOut : styles.showSidebar}`}>
            {/* Close Button */}
            <button className={styles.closeSidebarBtn} onClick={toggleMenu}>
              <FaChevronRight />
            </button>

            {/* Mobile Nav Links */}
            <Link 
              href="/" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/')}
            >
              Home
            </Link>
            <Link 
              href="/about" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/about')}
            >
              About Us
            </Link>
            <Link 
              href="/programs" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/programs')}
            >
              Programs and Services
            </Link>
            <Link 
              href="/faithree" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/faithree')}
            >
              FAIThree
            </Link>
            <Link 
              href="/faqs" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/faqs')}
            >
              FAQs
            </Link>

            {/* Mobile Buttons */}
            <div className={styles.mobileButtons}>
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
                <span>FAITH Colleges</span>
              </a>
              
              {isAuthenticated ? (
                <div className={styles.mobileUserProfile}>
                  <div className={styles.mobileProfileIcon}>
                    {user?.profile_photo_url ? (
                      <OptimizedImage
                        src={user.profile_photo_url}
                        alt="Profile"
                        width={48}
                        height={48}
                        className={styles.mobileProfileImage}
                        fallbackIcon={FaUser}
                      />
                    ) : (
                      <FaUser className={styles.mobileProfileIconDefault} />
                    )}
                  </div>
                  <span className={styles.userName}>
                    {user?.firstName} {user?.lastName}
                  </span>
                  <Link 
                    href="/profile" 
                    className={styles.mobileProfileLink}
                    onClick={toggleMenu}
                  >
                    <FaCog />
                    <span>Manage Account</span>
                  </Link>
                  <Link 
                    href="/profile?tab=applications" 
                    className={styles.mobileProfileLink}
                    onClick={toggleMenu}
                  >
                    <FaClipboardList />
                    <span>My Applications</span>
                  </Link>
                  <button 
                    onClick={() => { openLogoutModal(); toggleMenu(); }} 
                    className={styles.logoutBtn}
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className={styles.navbarLoginBtn} 
                    onClick={toggleMenu}
                  >
                    Log In or Sign Up
                  </Link>
                </>
              )}
              
              <Link 
                href="/apply" 
                className={styles.applyBtn} 
                onClick={(e) => { handleApplyClick(e); toggleMenu(); }}
                onMouseEnter={() => handleLinkHover('/apply')}
              >
                Apply
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ===== Logout Confirmation Modal (green gradient style) ===== */}
      {showLogoutConfirm && isMounted && createPortal(
        <div 
          className={styles.logoutModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          onClick={handleOverlayClick}
        >
          <div className={styles.logoutModal} role="document" onClick={stop}>
            
            <div id="logout-title" className={styles.logoutModalTitle}>
              Logout
            </div>
            
            <div className={styles.logoutModalText}>
              Are you sure you want to logout?
            </div>

            <div className={styles.logoutButtonGroup}>
              <button className={styles.logoutTextBtn} onClick={handleConfirmLogout}>
                Logout
              </button>
              <button className={styles.cancelBtn} onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}