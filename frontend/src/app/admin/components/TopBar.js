'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TbMail } from "react-icons/tb";
import { MdNotificationsNone } from "react-icons/md";
import { useNavigation } from '../../../contexts/NavigationContext';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation 
} from '../../../rtk/admin/notificationsApi';
import { useGetUnreadCountQuery as useGetInboxUnreadCountQuery } from '../../../rtk/admin/inboxApi';
import styles from './styles/topbar.module.css';

export default function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Fetch notifications data - limit to 3 for dropdown
  const { data: notificationsData, isLoading: notificationsLoading } = useGetNotificationsQuery(
    { adminId: currentAdmin?.id, limit: 3, offset: 0 },
    { skip: !currentAdmin?.id }
  );
  
  // Fetch unread count for notifications
  const { data: unreadCountData } = useGetUnreadCountQuery(
    currentAdmin?.id,
    { skip: !currentAdmin?.id }
  );

  // Fetch unread count for inbox messages
  const { data: inboxUnreadCountData } = useGetInboxUnreadCountQuery(
    currentAdmin?.org,
    { skip: !currentAdmin?.org }
  );
  
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  
  const hasUnreadNotifications = unreadCountData?.count > 0;
  const hasUnreadMessages = inboxUnreadCountData?.data?.count > 0;
  const notifications = notificationsData?.notifications || [];

  const router = useRouter();
  const pathname = usePathname();
  const { isNavigating } = useNavigation();

  useEffect(() => {
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      // setAdminData(JSON.parse(storedAdminData)); // This line was removed
    }
  }, []);

  const getBreadcrumbParts = () => {
    const pathSegments = pathname.split('/').filter(segment => segment !== '');

    if (pathSegments.length <= 1 || pathSegments[0] !== 'admin') {
      return { category: 'General', section: 'Dashboard' };
    }

    const adminSection = pathSegments[1];

    switch (adminSection) {
      case 'dashboard': return { category: 'General', section: 'Dashboard' };
      case 'volunteers': return { category: 'Management', section: 'Volunteers' };
      case 'organization': return { category: 'Management', section: 'Organization' };
      case 'programs': return { category: 'Management', section: 'Programs' };
      case 'news': return { category: 'Management', section: 'News' };
      case 'submissions': return { category: 'Management', section: 'Submissions' };
      case 'inbox': return { category: 'General', section: 'Inbox' };
      case 'settings': return { category: 'Account', section: 'Settings' };
      default: return { category: 'General', section: 'Dashboard' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  const toggleNotifications = async () => {
    setShowNotifications(prev => {
      if (!prev && hasUnreadNotifications) {
        // Mark all notifications as read when opening
        markAllAsRead(currentAdmin?.id);
      }
      return !prev;
    });
  };

  const handleInboxClick = () => {
    router.push('/admin/inbox');
  };

  const handleViewAllNotifications = () => {
    router.push('/admin/notifications');
  };

  // ❗ Detect click outside notification dropdown
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

  // Close notification dropdown when navigating to notifications page
  useEffect(() => {
    if (pathname === '/admin/notifications') {
      setShowNotifications(false);
    }
  }, [pathname]);

  const { category, section } = getBreadcrumbParts();

  return (
    <div className={styles.topBar}>
      {/* Global Navigation Loading Indicator */}
      {isNavigating && (
        <div className={styles.navigationLoader}>
          <div className={styles.loaderBar}></div>
        </div>
      )}
      
      <div className={styles.topBarContent}>
        <div className={styles.leftSection}>
          <span className={styles.breadcrumbText}>
            <span className={styles.breadcrumbCategory}>{category}</span>
            <span className={styles.breadcrumbSeparator}> &gt; </span>
            <span className={styles.breadcrumbSection}>{section}</span>
          </span>
        </div>
        <div className={styles.rightSection}>
          {/* Inbox Icon */}
          <div className={styles.iconButton} onClick={handleInboxClick}>
            <div className={styles.notificationWrapper}>
              <TbMail size={20} color="#06100f" />
              {hasUnreadMessages && <div className={styles.notificationBadge}></div>}
            </div>
          </div>

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
                {notificationsLoading ? (
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationContent}>
                      <p className={styles.notificationText}>Loading notifications...</p>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className={styles.notificationItem}>
                    <div className={styles.notificationContent}>
                      <p className={styles.notificationText}>No notifications yet</p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={styles.notificationItem}>
                      <div className={styles.notificationIcon}>
                        {notification.type === 'approval' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12L11 14L15 10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="2" />
                          </svg>
                        ) : notification.type === 'decline' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="2" />
                          </svg>
                        ) : notification.type === 'message' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="22,6 12,13 2,6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" />
                            <line x1="12" y1="8" x2="12" y2="12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                            <line x1="12" y1="16" x2="12.01" y2="16" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <div className={styles.notificationContent}>
                        <p className={styles.notificationText}>{notification.message}</p>
                        <span className={styles.notificationTime}>{notification.timeAgo}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className={styles.notificationsFooter}>
                <button className={styles.viewAllBtn} onClick={handleViewAllNotifications}>
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