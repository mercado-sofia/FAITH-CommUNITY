import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  notificationsApi
} from '@/rtk/admin/notificationsApi';
import { getRelativeTime } from '@/utils/shared/dateUtils';
import { usePusherNotifications } from './usePusherNotifications';
import { useSelector } from 'react-redux';
import { selectUserType } from '@/rtk/superadmin/adminSlice';

export const useAdminNotifications = (adminId) => {
  const dispatch = useDispatch();
  const userType = useSelector(selectUserType);
  const [newNotificationReceived, setNewNotificationReceived] = useState(false);
  const refetchNotificationsRef = useRef(null);
  const refetchUnreadCountRef = useRef(null);
  // Local state for immediate UI updates when Pusher notifications arrive
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState([]);
  // Flag to track if Pusher notifications have been received (prevents RTK Query from overwriting)
  const hasPusherNotificationsRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Determine Pusher user type based on Redux state
  const pusherUserType = userType === 'superadmin' ? 'superadmin' : 'admin';

  // Fetch notifications data with reduced polling as fallback
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications 
  } = useGetNotificationsQuery(
    { adminId, limit: 10, offset: 0 },
    { 
      skip: !adminId,
      // Reduce polling to 60 seconds as fallback (Pusher handles real-time)
      pollingInterval: 60000,
    }
  );
  
  // Fetch unread count for notifications with reduced polling as fallback
  const { 
    data: unreadCountData,
    refetch: refetchUnreadCount 
  } = useGetUnreadCountQuery(
    adminId,
    { 
      skip: !adminId,
      // Reduce polling to 60 seconds as fallback (Pusher handles real-time)
      pollingInterval: 60000,
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
    
    // Normalize Pusher data to match API response structure
    // Convert submissionId to submission_id to match API response
    const normalizedNotification = {
      ...notificationData,
      submission_id: notificationData.submissionId || notificationData.submission_id,
      // Remove submissionId if it exists (use submission_id instead)
    };
    // Remove submissionId if it exists to avoid duplicate fields
    if ('submissionId' in normalizedNotification && 'submission_id' in normalizedNotification) {
      delete normalizedNotification.submissionId;
    }
    
    // Immediately update local notifications for instant UI feedback
    setLocalNotifications(prev => {
      // Check if notification already exists (prevent duplicates)
      const exists = prev.some(n => n.id === normalizedNotification.id);
      if (!exists) {
        // Add new notification at the beginning
        return [normalizedNotification, ...prev];
      }
      return prev;
    });
    
    // Check if cache entries exist before updating
    const notificationsCache = notificationsApi.util.getQueryData(
      'getNotifications',
      { adminId, limit: 10, offset: 0 }
    );
    const unreadCountCache = notificationsApi.util.getQueryData(
      'getUnreadCount',
      adminId
    );
    
    // Optimistically update the RTK Query cache immediately if cache exists
    if (notificationsCache !== undefined) {
      try {
        // Update notifications list cache - add new notification to the beginning
        dispatch(
          notificationsApi.util.updateQueryData(
            'getNotifications',
            { adminId, limit: 10, offset: 0 },
            (draft) => {
              // Admin API returns { notifications: [...], total: number }
              const notifications = draft?.notifications || [];
              // Check if notification already exists (prevent duplicates)
              const exists = notifications.some(n => n.id === normalizedNotification.id);
              if (!exists) {
                // Add new notification at the beginning
                // Preserve total field and increment it
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
        console.error('Error updating admin notifications cache:', error);
      }
    }
    
    if (unreadCountCache !== undefined) {
      try {
        // Update unread count cache - increment by 1
        dispatch(
          notificationsApi.util.updateQueryData(
            'getUnreadCount',
            adminId,
            (draft) => {
              return {
                count: (draft?.count || 0) + 1
              };
            }
          )
        );
      } catch (error) {
        console.error('Error updating admin unread count cache:', error);
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
  }, [dispatch, adminId]);

  // Set up Pusher real-time subscription
  usePusherNotifications(
    adminId,
    pusherUserType,
    handleNewNotification,
    !!adminId
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
    const apiNotifications = notificationsData?.notifications || [];
    if (Array.isArray(apiNotifications)) {
      // Only update on initial load or if local state is empty and no Pusher notifications received
      const shouldSync = isInitialLoadRef.current || 
        (localNotifications.length === 0 && !hasPusherNotificationsRef.current);
      
      if (shouldSync && (apiNotifications.length > 0 || !notificationsLoading)) {
        setLocalNotifications(apiNotifications);
        isInitialLoadRef.current = false;
      } else if (isInitialLoadRef.current && !notificationsLoading) {
        // Mark initial load as complete even if we don't sync
        isInitialLoadRef.current = false;
      }
    }
  }, [notificationsData, notificationsLoading, localNotifications.length]);
  
  const [markAsRead] = useMarkAsReadMutation();
  
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
    : (notificationsData?.notifications || localNotifications || []);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead({ notificationId: notification.id, adminId });
        // Update local notifications immediately - mark as read
        setLocalNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
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
  }, [markAsRead, refetchNotifications, refetchUnreadCount, adminId]);

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
