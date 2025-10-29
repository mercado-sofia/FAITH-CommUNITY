import { useCallback } from 'react';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation
} from '../rtk/admin/notificationsApi';
import { getRelativeTime } from '../utils/dateUtils';

export const useAdminNotifications = (adminId) => {
  // Fetch notifications data
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications 
  } = useGetNotificationsQuery(
    { adminId, limit: 10, offset: 0 },
    { skip: !adminId }
  );
  
  // Fetch unread count for notifications
  const { 
    data: unreadCountData,
    refetch: refetchUnreadCount 
  } = useGetUnreadCountQuery(
    adminId,
    { skip: !adminId }
  );
  
  const [markAsRead] = useMarkAsReadMutation();
  
  const hasUnreadNotifications = unreadCountData?.count > 0;
  const notifications = notificationsData?.notifications || [];

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead({ notificationId: notification.id, adminId });
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
