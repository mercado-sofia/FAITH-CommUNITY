'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TbMail } from "react-icons/tb";
import { MdNotificationsNone } from "react-icons/md";
import { FiXCircle } from "react-icons/fi";
import { useNavigation } from '@/contexts/NavigationContext';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  notificationsApi
} from '@/rtk/admin/notificationsApi';
import { useGetUnreadCountQuery as useGetInboxUnreadCountQuery } from '@/rtk/admin/inboxApi';
import { 
  useGetSuperAdminNotificationsQuery, 
  useGetSuperAdminUnreadCountQuery, 
  useMarkSuperAdminAsReadMutation,
  superadminNotificationsApi
} from '@/rtk/superadmin/superadminNotificationsApi';
import { usePusherNotifications } from '@/hooks/shared/usePusherNotifications';
import { getOrganizationImageUrl } from '@/utils/shared/uploadPaths';
import { USER_TYPES } from '@/utils/shared/authService';
import { getBreadcrumbParts, adminBreadcrumbConfig, superadminBreadcrumbConfig } from './breadcrumbConfig';
import styles from './TopBar.module.css';

export default function TopBar({ 
  userType = USER_TYPES.ADMIN,
  basePath = '/admin'
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [superAdminData, setSuperAdminData] = useState(null);
  const notificationsRef = useRef(null);
  const bellIconRef = useRef(null);
  // Local state for immediate UI updates when Pusher notifications arrive
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [localSuperAdminUnreadCount, setLocalSuperAdminUnreadCount] = useState(0);
  
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const pathname = usePathname();
  const { isNavigating } = useNavigation();

  // Load superadmin data if needed
  useEffect(() => {
    if (userType === USER_TYPES.SUPERADMIN) {
      try {
        const storedSuperAdminData = localStorage.getItem('superAdminData');
        if (storedSuperAdminData) {
          setSuperAdminData(JSON.parse(storedSuperAdminData));
        }
      } catch (error) {
        // Handle error silently
      }
    }
  }, [userType]);

  // Admin notifications hooks
  const { data: adminNotificationsData, isLoading: adminNotificationsLoading } = useGetNotificationsQuery(
    { adminId: currentAdmin?.id, limit: 3, offset: 0 },
    { skip: userType !== USER_TYPES.ADMIN || !currentAdmin?.id }
  );
  
  const { data: adminUnreadCountData } = useGetUnreadCountQuery(
    currentAdmin?.id,
    { skip: userType !== USER_TYPES.ADMIN || !currentAdmin?.id }
  );

  const { data: inboxUnreadCountData } = useGetInboxUnreadCountQuery(
    currentAdmin?.org,
    { skip: userType !== USER_TYPES.ADMIN || !currentAdmin?.org }
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  // Handle new admin notification from Pusher
  const handleAdminNotification = useCallback((notificationData) => {
    // Immediately update local state for instant UI feedback
    setLocalUnreadCount(prev => prev + 1);
    
    // Normalize Pusher data to match API response structure
    const normalizedNotification = {
      ...notificationData,
      submission_id: notificationData.submissionId || notificationData.submission_id,
    };
    if ('submissionId' in normalizedNotification && 'submission_id' in normalizedNotification) {
      delete normalizedNotification.submissionId;
    }
    
    // Check if cache entries exist before updating
    const notificationsCache = notificationsApi.util.getQueryData(
      'getNotifications',
      { adminId: currentAdmin?.id, limit: 3, offset: 0 }
    );
    const unreadCountCache = notificationsApi.util.getQueryData(
      'getUnreadCount',
      currentAdmin?.id
    );
    
    // Optimistically update the RTK Query cache immediately if cache exists
    if (notificationsCache !== undefined) {
      try {
        dispatch(
          notificationsApi.util.updateQueryData(
            'getNotifications',
            { adminId: currentAdmin?.id, limit: 3, offset: 0 },
            (draft) => {
              const notifications = draft?.notifications || [];
              const exists = notifications.some(n => n.id === normalizedNotification.id);
              if (!exists) {
                return {
                  ...draft,
                  notifications: [normalizedNotification, ...notifications],
                  total: (draft?.total || notifications.length) + 1
                };
              }
              return draft;
            }
          )
        );
      } catch (error) {
        console.error('Error updating admin notifications cache in TopBar:', error);
      }
    }
    
    if (unreadCountCache !== undefined) {
      try {
        dispatch(
          notificationsApi.util.updateQueryData(
            'getUnreadCount',
            currentAdmin?.id,
            (draft) => {
              return {
                count: (draft?.count || 0) + 1
              };
            }
          )
        );
      } catch (error) {
        console.error('Error updating admin unread count cache in TopBar:', error);
      }
    }
    
    // Show popup notification
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(notificationData.title || 'New notification', 'info', 5000);
    }
  }, [dispatch, currentAdmin?.id]);

  // Set up Pusher real-time subscription for admin
  usePusherNotifications(
    currentAdmin?.id,
    'admin',
    handleAdminNotification,
    userType === USER_TYPES.ADMIN && !!currentAdmin?.id
  );

  // Superadmin notifications hooks
  const { data: superadminNotificationsData, isLoading: superadminNotificationsLoading } = useGetSuperAdminNotificationsQuery(
    { 
      superAdminId: superAdminData?.id, 
      limit: 3, 
      offset: 0 
    },
    { 
      skip: userType !== USER_TYPES.SUPERADMIN || !superAdminData?.id,
      pollingInterval: 30000
    }
  );

  const { data: superadminUnreadCountData } = useGetSuperAdminUnreadCountQuery(
    superAdminData?.id,
    { 
      skip: userType !== USER_TYPES.SUPERADMIN || !superAdminData?.id,
      pollingInterval: 30000
    }
  );

  const [markSuperAdminAsRead] = useMarkSuperAdminAsReadMutation();

  // Handle new superadmin notification from Pusher
  const handleSuperAdminNotification = useCallback((notificationData) => {
    // Immediately update local state for instant UI feedback
    setLocalSuperAdminUnreadCount(prev => prev + 1);
    
    // Check if cache entries exist before updating
    const notificationsCache = superadminNotificationsApi.util.getQueryData(
      'getSuperAdminNotifications',
      { superAdminId: superAdminData?.id, limit: 3, offset: 0 }
    );
    const unreadCountCache = superadminNotificationsApi.util.getQueryData(
      'getSuperAdminUnreadCount',
      superAdminData?.id
    );
    
    // Optimistically update the RTK Query cache immediately if cache exists
    if (notificationsCache !== undefined) {
      try {
        // Update notifications list cache - add new notification to the beginning
        dispatch(
          superadminNotificationsApi.util.updateQueryData(
            'getSuperAdminNotifications',
            { superAdminId: superAdminData?.id, limit: 3, offset: 0 },
            (draft) => {
              // Superadmin API returns { notifications: [...], total: number }
              const notifications = draft?.notifications || [];
              // Check if notification already exists (prevent duplicates)
              const exists = notifications.some(n => n.id === notificationData.id);
              if (!exists) {
                // Add new notification at the beginning
                // Preserve total field and increment it
                return {
                  ...draft,
                  notifications: [notificationData, ...notifications],
                  total: (draft?.total || notifications.length) + 1
                };
              }
              return draft;
            }
          )
        );
      } catch (error) {
        console.error('Error updating superadmin notifications cache:', error);
      }
    }
    
    if (unreadCountCache !== undefined) {
      try {
        // Update unread count cache - increment by 1
        dispatch(
          superadminNotificationsApi.util.updateQueryData(
            'getSuperAdminUnreadCount',
            superAdminData?.id,
            (draft) => {
              return {
                count: (draft?.count || 0) + 1
              };
            }
          )
        );
      } catch (error) {
        console.error('Error updating superadmin unread count cache:', error);
      }
    }
    
    // Show popup notification
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(notificationData.title || 'New notification', 'info', 5000);
    }
  }, [dispatch, superAdminData?.id]);

  // Set up Pusher real-time subscription for superadmin
  usePusherNotifications(
    superAdminData?.id,
    'superadmin',
    handleSuperAdminNotification,
    userType === USER_TYPES.SUPERADMIN && !!superAdminData?.id
  );

  // Sync local state with RTK Query data when it loads
  useEffect(() => {
    if (userType === USER_TYPES.ADMIN && adminUnreadCountData?.count !== undefined) {
      setLocalUnreadCount(adminUnreadCountData.count);
    }
  }, [userType, adminUnreadCountData?.count]);

  useEffect(() => {
    if (userType === USER_TYPES.SUPERADMIN && superadminUnreadCountData?.count !== undefined) {
      setLocalSuperAdminUnreadCount(superadminUnreadCountData.count);
    }
  }, [userType, superadminUnreadCountData?.count]);

  // Get notifications data based on user type
  const notifications = userType === USER_TYPES.ADMIN 
    ? (adminNotificationsData?.notifications || [])
    : (superadminNotificationsData?.notifications || []);

  const notificationsLoading = userType === USER_TYPES.ADMIN 
    ? adminNotificationsLoading 
    : superadminNotificationsLoading;

  const hasUnreadNotifications = userType === USER_TYPES.ADMIN
    ? ((adminUnreadCountData?.count > 0) || localUnreadCount > 0)
    : ((superadminUnreadCountData?.count > 0) || localSuperAdminUnreadCount > 0);

  const hasUnreadMessages = userType === USER_TYPES.ADMIN 
    ? (inboxUnreadCountData?.data?.count > 0)
    : false;

  // Get breadcrumb config
  const breadcrumbConfig = userType === USER_TYPES.ADMIN 
    ? adminBreadcrumbConfig 
    : superadminBreadcrumbConfig;

  const { category, section } = getBreadcrumbParts(pathname, basePath, breadcrumbConfig);

  // Helper function to format time ago (for superadmin)
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

  // Helper function to get notification icon (for superadmin)
  // Note: advocacy and competency are no longer part of the approval workflow
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
    if (userType === USER_TYPES.ADMIN) {
      // Admin: navigate to inbox for message notifications
      if (notification.type === 'message') {
        setShowNotifications(false);
        router.push('/admin/inbox');
      }
    } else {
      // Superadmin: mark as read and navigate to approvals
      if (!notification.is_read) {
        try {
          await markSuperAdminAsRead({
            notificationId: notification.id,
            superAdminId: superAdminData?.id
          }).unwrap();
        } catch (error) {
          // Handle error silently
        }
      }
      
      if (notification.section) {
        const params = new URLSearchParams({
          section: notification.section,
          organization: notification.organization_acronym || ''
        });
        
        if (notification.submission_id) {
          params.set('submissionId', notification.submission_id);
        } else if (notification.id) {
          params.set('searchTerm', notification.id.toString());
        }
        
        router.push(`/superadmin/approvals?${params.toString()}`);
      } else {
        router.push('/superadmin/notifications');
      }
      setShowNotifications(false);
    }
  };

  const toggleNotifications = async (e) => {
    if (e) e.stopPropagation();
    
    if (showNotifications) {
      setShowNotifications(false);
    } else {
      // Mark all as read for admin when opening
      if (userType === USER_TYPES.ADMIN && hasUnreadNotifications && currentAdmin?.id) {
        markAllAsRead(currentAdmin.id);
        // Reset local unread count immediately for instant UI feedback
        setLocalUnreadCount(0);
      }
      setShowNotifications(true);
    }
  };

  // Detect click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target) &&
        (!bellIconRef.current || !bellIconRef.current.contains(e.target)) &&
        !e.target.closest('[data-notification-button]')
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
    if (pathname === `${basePath}/notifications`) {
      setShowNotifications(false);
    }
  }, [pathname, basePath]);

  // Render notification icon (different for admin vs superadmin)
  const renderNotificationIcon = (notification) => {
    if (userType === USER_TYPES.SUPERADMIN) {
      // Superadmin: show org logo or fallback
      return (
        <div className={styles.notificationIcon}>
          {notification.orgLogo ? (
            <Image
              src={getOrganizationImageUrl(notification.orgLogo, 'logo')}
              alt={`${notification.organization_acronym} logo`}
              width={24}
              height={24}
              className={styles.organizationLogo}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className={styles.fallbackIcon}
            style={{ display: notification.orgLogo ? 'none' : 'flex' }}
          >
            {notification.organization_acronym ? (
              <span className={styles.organizationAcronymFallback}>
                {notification.organization_acronym.charAt(0).toUpperCase()}
              </span>
            ) : (
              getNotificationIcon(notification.type, notification.section)
            )}
          </div>
        </div>
      );
    } else {
      // Admin: show simple icons
      return (
        <div className={styles.notificationIcon}>
          {notification.type === 'approval' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="2" />
            </svg>
          ) : notification.type === 'decline' ? (
            <FiXCircle size={16} color="#ef4444" />
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
      );
    }
  };

  // Determine sidebar width based on user type
  const sidebarWidth = '260';

  return (
    <div className={styles.topBar} data-sidebar-width={sidebarWidth}>
      {/* Global Navigation Loading Indicator (Admin only) */}
      {userType === USER_TYPES.ADMIN && isNavigating && (
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
          {/* Inbox Icon (Admin only) */}
          {userType === USER_TYPES.ADMIN && (
            <Link href="/admin/inbox" prefetch={true}>
              <div className={styles.iconButton}>
                <div className={styles.notificationWrapper}>
                  <TbMail size={20} color="#06100f" />
                  {hasUnreadMessages && <div className={styles.notificationBadge}></div>}
                </div>
              </div>
            </Link>
          )}

          {/* Notifications Icon */}
          <div 
            className={styles.iconButton} 
            onClick={toggleNotifications} 
            ref={userType === USER_TYPES.SUPERADMIN ? bellIconRef : null}
            data-notification-button
          >
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
                      <p className={styles.notificationText}>
                        {userType === USER_TYPES.ADMIN ? 'No notifications yet' : 'No recent notifications'}
                      </p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`${styles.notificationItem} ${
                        userType === USER_TYPES.ADMIN && notification.type === 'message' 
                          ? styles.clickableMessage 
                          : ''
                      } ${
                        userType === USER_TYPES.SUPERADMIN && !notification.is_read 
                          ? styles.unreadNotification 
                          : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      style={userType === USER_TYPES.SUPERADMIN ? { cursor: 'pointer' } : {}}
                    >
                      {renderNotificationIcon(notification)}
                      <div className={styles.notificationContent}>
                        <p className={styles.notificationText}>{notification.message}</p>
                        <span className={styles.notificationTime}>
                          {notification.timeAgo || (userType === USER_TYPES.SUPERADMIN ? getTimeAgo(notification.created_at) : notification.timeAgo)}
                        </span>
                      </div>
                      {userType === USER_TYPES.SUPERADMIN && !notification.is_read && (
                        <div className={styles.unreadDot}></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className={styles.notificationsFooter}>
                {userType === USER_TYPES.ADMIN ? (
                  <Link href="/admin/notifications" prefetch={true}>
                    <button className={styles.viewAllBtn}>
                      View All Notifications
                    </button>
                  </Link>
                ) : (
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => {
                      setShowNotifications(false);
                      router.push('/superadmin/notifications');
                    }}
                  >
                    View All Notifications
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

