'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { TbMail } from "react-icons/tb";
import { MdNotificationsNone } from "react-icons/md";
import { useGetSuperAdminNotificationsQuery, useGetSuperAdminUnreadCountQuery, useMarkSuperAdminAsReadMutation } from '../../../rtk/superadmin/superadminNotificationsApi';
import { getOrganizationImageUrl } from '../../../utils/uploadPaths';
import styles from './styles/topbar.module.css';

export default function TopBar() {
  const [superAdminData, setSuperAdminData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const bellIconRef = useRef(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedSuperAdminData = localStorage.getItem('superAdminData');
    if (storedSuperAdminData) {
      setSuperAdminData(JSON.parse(storedSuperAdminData));
    }
  }, []);

  // Fetch recent notifications for the dropdown (limit to 3 most recent)
  const { data: notificationsData, isLoading: notificationsLoading } = useGetSuperAdminNotificationsQuery(
    { 
      superAdminId: superAdminData?.id, 
      limit: 3, 
      offset: 0 
    },
    { 
      skip: !superAdminData?.id,
      // Refresh every 30 seconds to get new notifications
      pollingInterval: 30000
    }
  );

  // Fetch unread count for the badge
  const { data: unreadCountData } = useGetSuperAdminUnreadCountQuery(
    superAdminData?.id,
    { 
      skip: !superAdminData?.id,
      pollingInterval: 30000
    }
  );

  // Mutation to mark notifications as read
  const [markAsRead] = useMarkSuperAdminAsReadMutation();

  // Update unread notification state
  useEffect(() => {
    if (unreadCountData?.count !== undefined) {
      setHasUnreadNotifications(unreadCountData.count > 0);
    }
  }, [unreadCountData]);

  // Helper function to format time ago
  const getTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  };

  // Helper function to get notification icon based on type and section
  const getNotificationIcon = (type, section) => {
    if (type === 'approval_request') {
      switch (section) {
        case 'programs':
          return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="#10c4a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="#10c4a6" strokeWidth="2" />
            </svg>
          );
        case 'advocacy':
        case 'competency':
          return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          );
        default:
          return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          );
      }
    } else if (type === 'decline') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
          <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    } else if (type === 'message') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="22,6 12,13 2,6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markAsRead({
          notificationId: notification.id,
          superAdminId: superAdminData?.id
        }).unwrap();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    
    // Navigate to approvals with filtering parameters
    if (notification.section) {
      const params = new URLSearchParams({
        section: notification.section,
        organization: notification.organization_acronym || ''
      });
      
      // Add submission ID if available, otherwise use notification ID for search
      if (notification.submission_id) {
        params.set('submissionId', notification.submission_id);
      } else if (notification.id) {
        params.set('searchTerm', notification.id.toString());
      }
      
      router.push(`/superadmin/approvals?${params.toString()}`);
    } else {
      // Fallback to notifications page if no section details
      router.push('/superadmin/notifications');
    }
    setShowNotifications(false);
  };

  const getBreadcrumbParts = () => {
    const pathSegments = pathname.split('/').filter(segment => segment !== '');

    if (pathSegments.length <= 1 || pathSegments[0] !== 'superadmin') {
      return { category: 'General', section: 'Dashboard' };
    }

    const superAdminSection = pathSegments[1];

    switch (superAdminSection) {
      case 'dashboard': return { category: 'General', section: 'Dashboard' };
      case 'approvals': return { category: 'Management', section: 'Approvals' };
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
    window.location.href = '/login';
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
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
        !notificationsRef.current.contains(e.target) &&
        bellIconRef.current &&
        !bellIconRef.current.contains(e.target)
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
          <div className={styles.iconButton} onClick={toggleNotifications} ref={bellIconRef}>
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
                {notificationsLoading ? (
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationContent}>
                      <p className={styles.notificationText}>Loading notifications...</p>
                    </div>
                  </div>
                ) : notificationsData?.notifications?.length > 0 ? (
                  notificationsData.notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`${styles.notificationItem} ${!notification.is_read ? styles.unreadNotification : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.notificationIcon}>
                        {notification.organization_logo ? (
                          <Image
                            src={getOrganizationImageUrl(notification.organization_logo, 'logo')}
                            alt={`${notification.organization_acronym} logo`}
                            width={24}
                            height={24}
                            className={styles.organizationLogo}
                            onError={(e) => {
                              // Fallback to generic icon if logo fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <div 
                          className={styles.fallbackIcon}
                          style={{ display: notification.organization_logo ? 'none' : 'block' }}
                        >
                          {getNotificationIcon(notification.type, notification.section)}
                        </div>
                      </div>
                      <div className={styles.notificationContent}>
                        <p className={styles.notificationText}>{notification.message}</p>
                        <span className={styles.notificationTime}>
                          {notification.timeAgo || getTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      {!notification.is_read && <div className={styles.unreadDot}></div>}
                    </div>
                  ))
                ) : (
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationContent}>
                      <p className={styles.notificationText}>No recent notifications</p>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.notificationsFooter}>
                <button 
                  className={styles.viewAllBtn}
                  onClick={() => {
                    setShowNotifications(false);
                    router.push('/superadmin/notifications');
                  }}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
