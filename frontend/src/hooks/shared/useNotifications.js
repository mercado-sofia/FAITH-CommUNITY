import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
  useGetUserNotificationsQuery, 
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  userNotificationsApi
} from '@/rtk/(public)/userNotificationsApi';
import { getRelativeTime } from '@/utils/shared/dateUtils';
import { usePusherNotifications } from './usePusherNotifications';
import { useAuthState } from './useAuthState';

export const useNotifications = (isAuthenticated) => {
  const dispatch = useDispatch();
  const { user } = useAuthState();
  const userId = user?.id;
  const [newNotificationReceived, setNewNotificationReceived] = useState(false);
  const refetchNotificationsRef = useRef(null);
  const refetchUnreadCountRef = useRef(null);
  // Local state for immediate UI updates when Pusher notifications arrive
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState([]);
  // Flag to track if Pusher notifications have been received (prevents RTK Query from overwriting)
  const hasPusherNotificationsRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Fetch notifications data with reduced polling as fallback
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications 
  } = useGetUserNotificationsQuery(
    undefined,
    { 
      skip: !isAuthenticated,
      // Reduce polling to 60 seconds as fallback (Pusher handles real-time)
      pollingInterval: 60000,
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Fetch unread count for notifications with reduced polling as fallback
  const { 
    data: unreadCountData,
    error: unreadCountError,
    refetch: refetchUnreadCount 
  } = useGetUnreadNotificationCountQuery(
    undefined,
    { 
      skip: !isAuthenticated,
      // Reduce polling to 60 seconds as fallback (Pusher handles real-time)
      pollingInterval: 60000,
      refetchOnMountOrArgChange: true,
    }
  );

  // Store refetch functions in refs for use in callbacks
  useEffect(() => {
    refetchNotificationsRef.current = refetchNotifications;
    refetchUnreadCountRef.current = refetchUnreadCount;
  }, [refetchNotifications, refetchUnreadCount]);

  // Handle new notification from Pusher
  const handleNewNotification = useCallback((notificationData) => {
    setNewNotificationReceived(true);
    // Mark that we've received Pusher notifications
    hasPusherNotificationsRef.current = true;
    
    // Immediately update local state for instant UI feedback
    setLocalUnreadCount(prev => prev + 1);
    setLocalNotifications(prev => {
      // Check if notification already exists (prevent duplicates)
      const exists = prev.some(n => n.id === notificationData.id);
      if (!exists) {
        // Add new notification at the beginning
        return [notificationData, ...prev];
      }
      return prev;
    });
    
    // Check if cache entries exist before updating
    const notificationsCache = userNotificationsApi.util.getQueryData(
      'getUserNotifications',
      undefined
    );
    const unreadCountCache = userNotificationsApi.util.getQueryData(
      'getUnreadNotificationCount',
      undefined
    );
    
    // Optimistically update the RTK Query cache immediately if cache exists
    if (notificationsCache !== undefined) {
      try {
        // Update notifications list cache - add new notification to the beginning
        dispatch(
          userNotificationsApi.util.updateQueryData(
            'getUserNotifications',
            undefined,
            (draft) => {
              // Ensure draft is an array
              if (!Array.isArray(draft)) {
                return [notificationData];
              }
              // Check if notification already exists (prevent duplicates)
              const exists = draft.some(n => n.id === notificationData.id);
              if (!exists) {
                // Add new notification at the beginning
                return [notificationData, ...draft];
              }
              return draft;
            }
          )
        );
      } catch (error) {
        console.error('Error updating notifications cache:', error);
      }
    }
    
    if (unreadCountCache !== undefined) {
      try {
        // Update unread count cache - increment by 1
        dispatch(
          userNotificationsApi.util.updateQueryData(
            'getUnreadNotificationCount',
            undefined,
            (draft) => {
              return {
                count: (draft?.count || 0) + 1
              };
            }
          )
        );
      } catch (error) {
        console.error('Error updating unread count cache:', error);
      }
    }
    
    // Always trigger refetch to ensure data consistency
    // This handles cases where cache doesn't exist yet or update failed
    if (refetchNotificationsRef.current) {
      refetchNotificationsRef.current();
    }
    if (refetchUnreadCountRef.current) {
      refetchUnreadCountRef.current();
    }
    
    // Show popup notification with proper message
    if (typeof window !== 'undefined') {
      // Wait a bit for toast system to be ready if needed
      const showToast = () => {
        if (window.showToast) {
          const message = notificationData.message 
            ? `${notificationData.title || 'New notification'}: ${notificationData.message}`
            : (notificationData.title || 'New notification');
          window.showToast(message, 'info', 5000);
        } else {
          // Retry after a short delay if toast system isn't ready
          setTimeout(showToast, 100);
        }
      };
      showToast();
    }
  }, [dispatch]);

  // Set up Pusher real-time subscription
  usePusherNotifications(
    userId,
    'user',
    handleNewNotification,
    isAuthenticated && !!userId
  );

  // Reset new notification flag after handling
  useEffect(() => {
    if (newNotificationReceived) {
      setNewNotificationReceived(false);
    }
  }, [newNotificationReceived]);

  // Sync local state with RTK Query data when it loads (only on initial load)
  useEffect(() => {
    if (unreadCountData?.count !== undefined && isInitialLoadRef.current) {
      setLocalUnreadCount(unreadCountData.count);
    }
  }, [unreadCountData?.count]);

  // Sync local notifications with RTK Query data when it loads
  // Only sync on initial load or when local state is empty and we haven't received Pusher notifications
  useEffect(() => {
    if (notificationsData && Array.isArray(notificationsData)) {
      // Only update on initial load or if local state is empty and no Pusher notifications received
      const shouldSync = isInitialLoadRef.current || 
        (localNotifications.length === 0 && !hasPusherNotificationsRef.current);
      
      if (shouldSync && (notificationsData.length > 0 || !notificationsLoading)) {
        setLocalNotifications(notificationsData);
        isInitialLoadRef.current = false;
      } else if (isInitialLoadRef.current && !notificationsLoading) {
        // Mark initial load as complete even if we don't sync
        isInitialLoadRef.current = false;
      }
    }
  }, [notificationsData, notificationsLoading, localNotifications.length]);

  const [markAsRead] = useMarkNotificationAsReadMutation();
  
  // Use local unread count as source of truth when Pusher notifications are active
  // Otherwise use RTK Query data
  const effectiveUnreadCount = hasPusherNotificationsRef.current 
    ? localUnreadCount 
    : (unreadCountData?.count || localUnreadCount || 0);
  
  const hasUnreadNotifications = effectiveUnreadCount > 0;
  
  // Use local notifications as source of truth when Pusher notifications are active
  // Fall back to RTK Query data if local state is empty (e.g., on initial load)
  const notifications = (hasPusherNotificationsRef.current && localNotifications.length > 0)
    ? localNotifications 
    : (Array.isArray(notificationsData) ? notificationsData : localNotifications);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    // Check both isRead and is_read for compatibility
    const isRead = notification.isRead || notification.is_read;
    if (!isRead) {
      try {
        await markAsRead(notification.id);
        // Update local notifications immediately - mark as read
        setLocalNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true, is_read: true } : n)
        );
        // Decrement local unread count immediately for instant UI feedback
        setLocalUnreadCount(prev => Math.max(0, prev - 1));
        // Refetch data to update UI
        refetchNotifications();
        refetchUnreadCount();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  }, [markAsRead, refetchNotifications, refetchUnreadCount]);


  // Format notification time using centralized utility
  const formatNotificationTime = useCallback((createdAt) => {
    return getRelativeTime(createdAt);
  }, []);

  return {
    notifications,
    notificationsLoading,
    hasUnreadNotifications,
    unreadCount: effectiveUnreadCount,
    handleNotificationClick,
    formatNotificationTime,
    refetchNotifications,
    refetchUnreadCount
  };
};