'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useGetNotificationsQuery } from '@/rtk/admin/notificationsApi';
import { FiTrash2, FiEye } from 'react-icons/fi';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import styles from '../notifications.module.css';

export default function InfiniteScrollNotifications({ 
  currentTab = 'all',
  onNotificationSelect,
  selectedNotifications = [],
  onMarkAsRead,
  onDeleteClick,
  getNotificationIcon 
}) {
  const currentAdmin = useSelector(selectCurrentAdmin);
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

  // Create a stable query key that includes the tab to prevent cache conflicts
  const queryParams = useMemo(() => ({
    adminId: currentAdmin?.id, 
    limit: itemsPerPage, 
    offset: (currentPage - 1) * itemsPerPage
  }), [currentAdmin?.id, itemsPerPage, currentPage]);

  // Fetch notifications for current page
  const { data: notificationsData, isLoading, error } = useGetNotificationsQuery(
    queryParams,
    { 
      skip: !currentAdmin?.id,
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
        return notification.type === 'approval' || notification.type === 'decline';
      case 'collaborations':
        return notification.type === 'collaboration' || notification.type === 'program_approval';
      case 'messages':
        return notification.type === 'message';
      default:
        return true;
    }
  });

  // Handle clicking on message notifications to navigate to inbox
  const handleNotificationClick = useCallback((notification, event) => {
    // Don't navigate if clicking on interactive elements
    if (event.target.closest('input, button')) {
      return;
    }
    
    // Only make message notifications clickable
    if (notification.type === 'message') {
      router.push('/admin/inbox');
    }
  }, [router]);

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
        
        return (
          <div 
            key={notification.id}
            ref={ref}
            className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''} ${notification.type === 'message' ? styles.clickableMessage : ''}`}
            onClick={(e) => handleNotificationClick(notification, e)}
          >
            <div className={styles.notificationCheckbox}>
              <input
                type="checkbox"
                checked={selectedNotifications.includes(notification.id)}
                onChange={() => onNotificationSelect(notification.id)}
              />
            </div>
            
            <div className={`${styles.notificationIcon} ${notification.type === 'message' ? styles.messageIcon : ''}`}>
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className={styles.notificationContent}>
              <div className={styles.notificationHeader}>
                <h4 className={styles.notificationTitle}>{notification.title}</h4>
                <div className={styles.notificationTimeContainer}>
                  <span className={styles.notificationTime}>{notification.timeAgo}</span>
                  {!notification.is_read && (
                    <div className={styles.unreadIndicator}></div>
                  )}
                </div>
              </div>
              <p className={styles.notificationMessage}>{notification.message}</p>
              {notification.section && (notification.type === 'approval' || notification.type === 'decline') && (
                <span className={styles.notificationSection}>
                  Section: {notification.section}
                </span>
              )}
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
