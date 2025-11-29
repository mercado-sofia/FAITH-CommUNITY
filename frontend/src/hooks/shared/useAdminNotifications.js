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
    
    // Show popup notification
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(notificationData.title || 'New notification', 'info', 5000);
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

  // Sync local state with RTK Query data when it loads
  useEffect(() => {
    if (unreadCountData?.count !== undefined) {
      setLocalUnreadCount(unreadCountData.count);
    }
  }, [unreadCountData?.count]);
  
  const [markAsRead] = useMarkAsReadMutation();
  
  const hasUnreadNotifications = (unreadCountData?.count > 0) || localUnreadCount > 0;
  const notifications = notificationsData?.notifications || [];

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead({ notificationId: notification.id, adminId });
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
    unreadCount: unreadCountData?.count || 0,
    handleNotificationClick,
    formatNotificationTime,
    refetchNotifications,
    refetchUnreadCount
  };
};
