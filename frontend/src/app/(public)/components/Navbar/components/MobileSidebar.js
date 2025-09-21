'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import OptimizedImage from '../../../../../components/OptimizedImage';
import styles from './styles/MobileSidebar.module.css';
import { FaChevronRight, FaUser, FaSignOutAlt, FaCog, FaClipboardList } from 'react-icons/fa';

export default function MobileSidebar({ 
  menuOpen, 
  isSlidingOut, 
  toggleMenu, 
  isAuthenticated, 
  user, 
  onLogoutClick,
  handleApplyClick,
  handleLinkHover 
}) {
  const router = useRouter();

  if (!menuOpen) {
    return null;
  }

  return (
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
              onClick={() => { onLogoutClick(); toggleMenu(); }} 
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
  );
}
