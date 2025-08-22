'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useAuthState } from '../../../hooks/useAuthState';
import { useNotifications } from '../../../hooks/useNotifications';
import { useDropdown } from '../../../hooks/useDropdown';
import OptimizedImage from '../../../components/OptimizedImage';
import styles from './styles/navbar.module.css';
import { 
  FaBars, 
  FaChevronRight, 
  FaUser, 
  FaSignOutAlt, 
  FaBell,
  FaCog,
  FaTimes,
  FaClipboardList
} from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const resizeTimeoutRef = useRef(null);

  // Use custom hooks for dropdowns and notifications
  const profileDropdown = useDropdown(false);
  const notificationsDropdown = useDropdown(false);
  const notifications = useNotifications(isAuthenticated);

  // Handle apply button click
  const handleApplyClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      // Dispatch custom event to show login modal
      window.dispatchEvent(new CustomEvent('showLoginModal'));
    }
  };

  // Optimized close sidebar function
  const handleCloseSidebar = useCallback(() => {
    setIsSlidingOut(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsSlidingOut(false);
    }, 300);
  }, []);

  // Optimized toggle menu function
  const toggleMenu = useCallback(() => {
    if (menuOpen) {
      handleCloseSidebar();
    } else {
      setMenuOpen(true);
    }
  }, [menuOpen, handleCloseSidebar]);

  // Optimized resize handler with debouncing
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      if (window.innerWidth > 1180) {
        setMenuOpen(false);
      }
    }, 100);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize]);

  // Prefetch pages on hover for instant navigation
  const handleLinkHover = useCallback((href) => {
    if (href && href !== '/') {
      router.prefetch(href);
    }
  }, [router]);

  // Handle user logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
    profileDropdown.close();
    notificationsDropdown.close();
  };

  // Handle confirmed logout
  const handleConfirmedLogout = async () => {
    await logout();
  };

  // Show loading state while auth is initializing
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
            className={styles.navLink}
            onMouseEnter={() => handleLinkHover('/')}
          >
            Home
          </Link>
          <Link 
            href="/about" 
            className={styles.navLink}
            onMouseEnter={() => handleLinkHover('/about')}
          >
            About Us
          </Link>
          <Link 
            href="/programs" 
            className={styles.navLink}
            onMouseEnter={() => handleLinkHover('/programs')}
          >
            Programs and Services
          </Link>
          <Link 
            href="/#faithree" 
            className={styles.navLink}
            onMouseEnter={() => handleLinkHover('/#faithree')}
          >
            FAIThree
          </Link>
          <Link 
            href="/faqs" 
            className={styles.navLink}
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
            // User is logged in - show Apply button first, then notification and profile icons
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
                  onClick={notificationsDropdown.toggle}
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
                      {notifications.notifications.length > 0 && (
                        <button 
                          className={styles.markAllReadBtn}
                          onClick={notifications.markAllAsRead}
                        >
                          Mark all read
                        </button>
                      )}
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
                            onClick={() => notifications.markAsRead(notification.id)}
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
                  </div>
                )}
              </div>

              {/* Profile Icon */}
              <div className={styles.profileWrapper} ref={profileDropdown.ref}>
                <button 
                  className={styles.profileBtn}
                  onClick={profileDropdown.toggle}
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
                      href="/my-applications" 
                      className={styles.profileDropdownItem}
                      onClick={profileDropdown.close}
                    >
                      <FaClipboardList />
                      <span>My Applications</span>
                    </Link>
                    <button 
                      className={styles.profileDropdownItem}
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // User is not logged in - show login/signup buttons and Apply button
            <>
              <Link href="/login" className={styles.navbarLoginBtn}>
                Log In
              </Link>
              <Link href="/signup" className={styles.signupBtn}>
                Sign Up
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

          {/* Hamburger Icon */}
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
              href="/#faithree" 
              className={styles.mobileNavLink} 
              onClick={toggleMenu}
              onMouseEnter={() => handleLinkHover('/#faithree')}
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
                // User is logged in - show profile and logout
                <>
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
                      href="/my-applications" 
                      className={styles.mobileProfileLink}
                      onClick={toggleMenu}
                    >
                      <FaClipboardList />
                      <span>My Applications</span>
                    </Link>
                    <button 
                      onClick={async () => { await handleConfirmedLogout(); toggleMenu(); }} 
                      className={styles.logoutBtn}
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                // User is not logged in - show login/signup buttons
                <>
                  <Link 
                    href="/login" 
                    className={styles.navbarLoginBtn} 
                    onClick={toggleMenu}
                  >
                    Log In
                  </Link>
                  <Link 
                    href="/signup" 
                    className={styles.signupBtn} 
                    onClick={toggleMenu}
                  >
                    Sign Up
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Logout</h3>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={styles.closeButton}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to logout?</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={handleConfirmedLogout}
                className={styles.confirmButton}
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}