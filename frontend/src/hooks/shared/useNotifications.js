import { useCallback } from 'react';
import { 
  useGetUserNotificationsQuery, 
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation
} from '@/rtk/(public)/userNotificationsApi';
import { getRelativeTime } from '@/utils/shared/dateUtils';

export const useNotifications = (isAuthenticated) => {
  // Fetch notifications data with polling for real-time updates
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications 
  } = useGetUserNotificationsQuery(
    undefined,
    { 
      skip: !isAuthenticated,
      pollingInterval: 30000, // Poll every 30 seconds for new notifications
      refetchOnMountOrArgChange: true, // Refetch when component mounts or args change
    }
  );
  
  // Fetch unread count for notifications with polling
  const { 
    data: unreadCountData,
    error: unreadCountError,
    refetch: refetchUnreadCount 
  } = useGetUnreadNotificationCountQuery(
    undefined,
    { 
      skip: !isAuthenticated,
      pollingInterval: 30000, // Poll every 30 seconds for unread count updates
      refetchOnMountOrArgChange: true,
    }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  
  const hasUnreadNotifications = unreadCountData?.count > 0;
  // After transformResponse, notificationsData is the array directly
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    // Check both isRead and is_read for compatibility
    const isRead = notification.isRead || notification.is_read;
    if (!isRead) {
      try {
        await markAsRead(notification.id);
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
    unreadCount: unreadCountData?.count || 0,
    handleNotificationClick,
    formatNotificationTime,
    refetchNotifications,
    refetchUnreadCount
  };
};
