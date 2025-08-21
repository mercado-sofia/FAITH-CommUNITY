import { useCallback } from 'react';
import { 
  useGetUserNotificationsQuery, 
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation 
} from '../rtk/(public)/userNotificationsApi';

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
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  
  const hasUnreadNotifications = unreadCountData?.count > 0;
  const notifications = notificationsData?.notifications || [];

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.is_read) {
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

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      // Refetch data to update UI
      refetchNotifications();
      refetchUnreadCount();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [markAllAsRead, refetchNotifications, refetchUnreadCount]);

  // Format notification time
  const formatNotificationTime = useCallback((createdAt) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  return {
    notifications,
    notificationsLoading,
    hasUnreadNotifications,
    unreadCount: unreadCountData?.count || 0,
    handleNotificationClick,
    handleMarkAllAsRead,
    formatNotificationTime,
    refetchNotifications,
    refetchUnreadCount
  };
};
