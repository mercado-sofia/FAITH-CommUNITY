'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './styles/navbar.module.css';
import { FaBars, FaChevronRight, FaUser, FaSignOutAlt } from 'react-icons/fa';

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Handle apply button click
  const handleApplyClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      // Dispatch custom event to show login modal
      window.dispatchEvent(new CustomEvent('showLoginModal'));
    }
  };

  // Add preload links for navbar pages
  useEffect(() => {
    const preloadLinks = [
      { href: '/about', as: 'document' },
      { href: '/programs', as: 'document' },
      { href: '/faqs', as: 'document' },
      { href: '/apply', as: 'document' }
    ];

    preloadLinks.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Cleanup function to remove preload links when component unmounts
    return () => {
      preloadLinks.forEach(({ href }) => {
        const existingLink = document.querySelector(`link[rel="preload"][href="${href}"]`);
        if (existingLink) {
          existingLink.remove();
        }
      });
    };
  }, []);

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
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUserData(null);
    setIsLoggedIn(false);
    router.push('/');
  };

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
          
          {isLoggedIn ? (
            // User is logged in - show profile and logout
            <>
              <div className={styles.userProfile}>
                <FaUser className={styles.userIcon} />
                <span className={styles.userName}>
                  {userData?.firstName} {userData?.lastName}
                </span>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <FaSignOutAlt />
                </button>
              </div>
            </>
          ) : (
            // User is not logged in - show login/signup buttons
            <>
              <Link href="/login" className={styles.loginBtn}>
                Log In
              </Link>
              <Link href="/signup" className={styles.signupBtn}>
                Sign Up
              </Link>
            </>
          )}

          <Link 
            href="/apply" 
            className={styles.applyBtn}
            onMouseEnter={() => handleLinkHover('/apply')}
            onClick={handleApplyClick}
          >
            Apply
          </Link>

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
              
              {isLoggedIn ? (
                // User is logged in - show profile and logout
                <>
                  <div className={styles.mobileUserProfile}>
                    <FaUser className={styles.userIcon} />
                    <span className={styles.userName}>
                      {userData?.firstName} {userData?.lastName}
                    </span>
                    <button onClick={() => { handleLogout(); toggleMenu(); }} className={styles.logoutBtn}>
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
                    className={styles.loginBtn} 
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
    </div>
  );
}