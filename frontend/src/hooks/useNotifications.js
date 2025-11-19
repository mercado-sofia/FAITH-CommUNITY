import { useCallback, useEffect } from 'react';
import { 
  useGetUserNotificationsQuery, 
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation
} from '../rtk/(public)/userNotificationsApi';
import { getRelativeTime } from '../utils/dateUtils';
import { useSocket } from '../contexts/SocketContext';

export const useNotifications = (isAuthenticated) => {
  // Get socket connection (will be null if not connected or not authenticated)
  const { socket, isConnected } = useSocket();
  
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

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!isAuthenticated || !socket || !isConnected) {
      return;
    }

    const handleNotification = (notification) => {
      console.log('Real-time notification received:', notification);
      
      // Refetch notifications to get the latest data from the server
      // This ensures we have the actual notification ID and all fields
      refetchNotifications();
      refetchUnreadCount();
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, isConnected, isAuthenticated, refetchNotifications, refetchUnreadCount]);

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
