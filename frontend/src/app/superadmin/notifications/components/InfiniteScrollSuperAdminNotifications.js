'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectCurrentSuperAdmin } from '../../../../rtk/superadmin/adminSlice';
import { useGetSuperAdminNotificationsQuery } from '../../../../rtk/superadmin/superadminNotificationsApi';
import { FiTrash2, FiEye, FiClock, FiUser } from 'react-icons/fi';
import Image from 'next/image';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
import SkeletonLoader from '../../../admin/components/SkeletonLoader';
import styles from '../notifications.module.css';

export default function InfiniteScrollSuperAdminNotifications({ 
  currentTab = 'all',
  onNotificationSelect,
  selectedNotifications = [],
  onMarkAsRead,
  onDeleteClick
}) {
  const currentSuperAdmin = useSelector(selectCurrentSuperAdmin);
  const router = useRouter();
  const [allNotifications, setAllNotifications] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const itemsPerPage = 20;
  
  const observer = useRef();
  const currentTabRef = useRef(currentTab);

  // Reset everything when tab changes
  useEffect(() => {
    if (currentTabRef.current !== currentTab) {
      setAllNotifications([]);
      setCurrentPage(1);
      setHasNextPage(true);
      setIsLoadingMore(false);
      setIsInitialized(false);
      currentTabRef.current = currentTab;
    }
  }, [currentTab]);

  // Get superadmin ID from localStorage
  const [superAdminId, setSuperAdminId] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const superAdminData = localStorage.getItem('superAdminData');
      console.log('InfiniteScroll - SuperAdmin data from localStorage:', superAdminData);
      if (superAdminData) {
        try {
          const parsedData = JSON.parse(superAdminData);
          console.log('InfiniteScroll - Parsed superadmin data:', parsedData);
          setSuperAdminId(parsedData.id);
        } catch (error) {
          console.error('Error parsing superadmin data:', error);
        }
      }
    }
  }, []);

  // Create a stable query key that includes the tab to prevent cache conflicts
  const queryParams = useMemo(() => ({
    superAdminId: superAdminId, 
    limit: itemsPerPage, 
    offset: (currentPage - 1) * itemsPerPage
  }), [superAdminId, itemsPerPage, currentPage]);

  // Fetch notifications for current page
  const { data: notificationsData, isLoading, error } = useGetSuperAdminNotificationsQuery(
    queryParams,
    { 
      skip: !superAdminId,
      // Use selectFromResult to ensure we get fresh data for each tab
      selectFromResult: ({ data, isLoading, error }) => ({
        data,
        isLoading,
        error
      })
    }
  );

  // Update notifications when new data arrives
  useEffect(() => {
    if (notificationsData?.notifications && !isLoading) {
      const newNotifications = notificationsData.notifications;
      const totalAvailable = notificationsData.total || 0;
      
      if (currentPage === 1 || !isInitialized) {
        // First page or after reset - replace all
        setAllNotifications(newNotifications);
        setIsInitialized(true);
      } else {
        // Subsequent pages - append unique notifications
        setAllNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      // Check if there are more pages
      const totalLoaded = (currentPage - 1) * itemsPerPage + newNotifications.length;
      setHasNextPage(totalLoaded < totalAvailable);
      setIsLoadingMore(false);
    }
  }, [notificationsData, currentPage, itemsPerPage, isLoading, isInitialized]);

  // Intersection Observer callback
  const lastNotificationCallback = useCallback(node => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        setIsLoadingMore(true);
        setCurrentPage(prev => prev + 1);
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px' // Start loading 100px before reaching the end
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasNextPage]);

  // Filter notifications based on current tab
  const filteredNotifications = allNotifications.filter(notification => {
    switch (currentTab) {
      case 'submissions':
        return notification.type === 'approval_request' || notification.type === 'decline';
      case 'messages':
        return notification.type === 'message';
      default:
        return true;
    }
  });

  // Handle clicking on notifications to navigate and mark as read
  const handleNotificationClick = useCallback((notification, event) => {
    // Don't navigate if clicking on interactive elements
    if (event.target.closest('input, button')) {
      return;
    }
    
    // Mark as read when clicked
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message') {
      router.push('/superadmin/inbox');
    } else if (notification.type === 'approval_request') {
      // Navigate to pending approvals with filtering parameters
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
        router.push('/superadmin/approvals');
      }
    }
  }, [router, onMarkAsRead]);

  // Show initial loading
  if (isLoading && (currentPage === 1 || !isInitialized)) {
    return <SkeletonLoader type="table" count={8} />;
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  // Show empty state only if we have initialized and got data
  if (filteredNotifications.length === 0 && !isLoading && isInitialized) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>No notifications yet</h3>
        <p>You&apos;re all caught up! New notifications will appear here.</p>
      </div>
    );
  }

  // Show loading state if not initialized yet
  if (!isInitialized && !isLoading) {
    return <SkeletonLoader type="table" count={8} />;
  }

  return (
    <div className={styles.notificationsList}>
      {filteredNotifications.map((notification, index) => {
        // Apply ref to the last item for intersection observer
        const isLast = index === filteredNotifications.length - 1;
        const ref = isLast ? lastNotificationCallback : null;
        
        // Debug logging
        console.log('Rendering notification:', {
          id: notification.id,
          organization_acronym: notification.organization_acronym,
          organization_logo: notification.organization_logo,
          constructed_url: notification.organization_logo ? getOrganizationImageUrl(notification.organization_logo, 'logo') : 'No logo'
        });

        return (
          <div 
            key={notification.id}
            ref={ref}
            className={`${styles.notificationItem} ${styles.clickableNotification}`}
            onClick={(e) => handleNotificationClick(notification, e)}
          >
            <div className={styles.notificationCheckbox}>
              <input
                type="checkbox"
                checked={selectedNotifications.includes(notification.id)}
                onChange={() => onNotificationSelect(notification.id)}
              />
            </div>
            
            {/* Organization Logo */}
            <div className={styles.organizationLogoContainer}>
              {notification.organization_logo ? (
                <img
                  src={getOrganizationImageUrl(notification.organization_logo, 'logo')}
                  alt={`${notification.organization_acronym} logo`}
                  width={40}
                  height={40}
                  className={styles.organizationLogo}
                  onError={(e) => {
                    console.log('Logo load error for:', notification.organization_acronym, 'URL:', getOrganizationImageUrl(notification.organization_logo, 'logo'));
                    // Show organization acronym as fallback
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully for:', notification.organization_acronym, 'URL:', getOrganizationImageUrl(notification.organization_logo, 'logo'));
                  }}
                />
              ) : null}
              <div 
                className={styles.organizationLogoPlaceholder}
                style={{ display: notification.organization_logo ? 'none' : 'flex' }}
              >
                {notification.organization_acronym ? (
                  <span className={styles.organizationAcronymFallback}>
                    {notification.organization_acronym.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <FiUser size={20} />
                )}
              </div>
            </div>

            {/* Notification Icon - Removed */}
            
            <div className={styles.notificationContent}>
              <div className={styles.notificationHeader}>
                <div className={styles.notificationTitleContainer}>
                  <h4 className={styles.notificationTitle}>{notification.title}</h4>
                </div>
                <div className={styles.notificationTimeContainer}>
                  <FiClock size={12} />
                  <span className={styles.notificationTime}>{notification.timeAgo}</span>
                </div>
              </div>
              <p className={styles.notificationMessage}>{notification.message}</p>
              <div className={styles.notificationTags}>
                {notification.section && (notification.type === 'approval_request' || notification.type === 'decline') && (
                  <span className={styles.notificationSection}>
                    {notification.section.charAt(0).toUpperCase() + notification.section.slice(1)}
                  </span>
                )}
                {notification.organization_acronym && (
                  <span className={styles.organizationAcronym}>
                    {notification.organization_acronym}
                  </span>
                )}
                <span className={`${styles.statusBadge} ${notification.is_read ? styles.readStatus : styles.unreadStatus}`}>
                  {notification.is_read ? 'Read' : 'New'}
                </span>
              </div>
            </div>
            
            <div className={styles.notificationActions}>
              {!notification.is_read && (
                <button
                  className={styles.markReadBtn}
                  onClick={() => onMarkAsRead(notification.id)}
                  title="Mark as read"
                >
                  <FiEye size={16} />
                </button>
              )}
              <button
                className={styles.deleteBtn}
                onClick={() => onDeleteClick(notification)}
                title="Delete notification"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
      
      {/* Loading indicator for more items */}
      {isLoadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading more notifications...</span>
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasNextPage && filteredNotifications.length > 0 && (
        <div className={styles.endOfList}>
          <span>You&apos;ve reached the end of your notifications</span>
        </div>
      )}
    </div>
  );
}
