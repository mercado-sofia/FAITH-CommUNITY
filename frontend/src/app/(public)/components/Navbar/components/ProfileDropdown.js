'use client';

import Link from 'next/link';
import { useDropdown } from '../../../../../hooks/useDropdown';
import OptimizedImage from '../../../../../components/OptimizedImage';
import { getProfilePhotoUrl } from '../../../../../utils/uploadPaths';
import styles from './styles/ProfileDropdown.module.css';
import { FaChevronRight, FaUser, FaSignOutAlt, FaCog, FaClipboardList } from 'react-icons/fa';

export default function ProfileDropdown({ user, isAuthenticated, onLogoutClick }) {
  const profileDropdown = useDropdown(false);

  // Ensure only one dropdown is open at a time
  const handleProfileToggle = () => {
    profileDropdown.toggle();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`${styles.profileWrapper} ${profileDropdown.isOpen ? styles.open : ''}`} ref={profileDropdown.ref}>
      <button 
        className={styles.profileBtn}
        onClick={handleProfileToggle}
      >
        <div className={styles.profileIcon}>
          {user?.profile_photo_url ? (
            <OptimizedImage
              src={getProfilePhotoUrl(user.profile_photo_url)}
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
                  src={getProfilePhotoUrl(user.profile_photo_url)}
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
            onClick={() => {
              onLogoutClick();
              profileDropdown.close();
            }}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
