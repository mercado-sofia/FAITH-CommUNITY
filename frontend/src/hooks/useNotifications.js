import { useCallback } from 'react';
import { 
  useGetUserNotificationsQuery, 
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation
} from '../rtk/(public)/userNotificationsApi';
import { getRelativeTime } from '../utils/dateUtils';

export const useNotifications = (isAuthenticated) => {
  // Fetch notifications data
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    refetch: refetchNotifications 
  } = useGetUserNotificationsQuery(
    undefined,
    { skip: !isAuthenticated }
  );
  
  // Fetch unread count for notifications
  const { 
    data: unreadCountData,
    refetch: refetchUnreadCount 
  } = useGetUnreadNotificationCountQuery(
    undefined,
    { skip: !isAuthenticated }
  );
  
  const [markAsRead] = useMarkNotificationAsReadMutation();
  
  const hasUnreadNotifications = unreadCountData?.count > 0;
  const notifications = notificationsData?.notifications || [];

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        // Refetch data to update UI
        refetchNotifications();
        refetchUnreadCount();
      } catch (error) {
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
