'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TbMail } from "react-icons/tb";
import { MdNotificationsNone } from "react-icons/md";
import styles from '../styles/topbar.module.css';

export default function TopBar() {
  const [superAdminData, setSuperAdminData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedSuperAdminData = localStorage.getItem('superAdminData');
    if (storedSuperAdminData) {
      setSuperAdminData(JSON.parse(storedSuperAdminData));
    }
  }, []);

  const getBreadcrumbParts = () => {
    const pathSegments = pathname.split('/').filter(segment => segment !== '');

    if (pathSegments.length <= 1 || pathSegments[0] !== 'superadmin') {
      return { category: 'General', section: 'Dashboard' };
    }

    const superAdminSection = pathSegments[1];

    switch (superAdminSection) {
      case 'dashboard': return { category: 'General', section: 'Dashboard' };
      case 'organizations': return { category: 'Management', section: 'Organizations' };
      case 'approvals': return { category: 'Management', section: 'Pending Approvals' };
      case 'programs': return { category: 'Management', section: 'Programs' };
      case 'faqs': return { category: 'Management', section: 'FAQs' };
      case 'manageProfiles': return { category: 'Management', section: 'Manage Profiles' };
      case 'settings': return { category: 'Account', section: 'Settings' };
      default: return { category: 'General', section: 'Dashboard' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminData');
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => {
      if (!prev && hasUnreadNotifications) {
        setHasUnreadNotifications(false);
      }
      return !prev;
    });
  };

  // Detect click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const { category, section } = getBreadcrumbParts();

  return (
    <div className={styles.topBar}>
      <div className={styles.topBarContent}>
        <div className={styles.leftSection}>
          <span className={styles.breadcrumbText}>
            <span className={styles.breadcrumbCategory}>{category}</span>
            <span className={styles.breadcrumbSeparator}> &gt; </span>
            <span className={styles.breadcrumbSection}>{section}</span>
          </span>
        </div>
        <div className={styles.rightSection}>
          {/* Notifications Icon */}
          <div className={styles.iconButton} onClick={toggleNotifications}>
            <div className={styles.notificationWrapper}>
              <MdNotificationsNone size={20} color="#06100f" />
              {hasUnreadNotifications && <div className={styles.notificationBadge}></div>}
            </div>
          </div>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className={`${styles.notificationsDropdown} ${styles.popEffect}`}
              ref={notificationsRef}
            >
              <div className={styles.notificationsHeader}>
                <h3>Notifications</h3>
              </div>
              <div className={styles.notificationsList}>
                {/* Example Notifications */}
                <div className={styles.notificationItem}>
                  <div className={styles.notificationIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12L11 14L15 10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationText}>New organization registration pending approval</p>
                    <span className={styles.notificationTime}>1 hour ago</span>
                  </div>
                </div>

                <div className={styles.notificationItem}>
                  <div className={styles.notificationIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="22,6 12,13 2,6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationText}>Admin submitted organization updates</p>
                    <span className={styles.notificationTime}>3 hours ago</span>
                  </div>
                </div>

                <div className={styles.notificationItem}>
                  <div className={styles.notificationIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" />
                      <line x1="12" y1="8" x2="12" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationText}>System maintenance completed successfully</p>
                    <span className={styles.notificationTime}>1 day ago</span>
                  </div>
                </div>
              </div>
              <div className={styles.notificationsFooter}>
                <button className={styles.viewAllBtn}>View All Notifications</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
