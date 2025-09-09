'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation 
} from '../../../rtk/admin/notificationsApi';
import { FiX } from 'react-icons/fi';
import { PiChecksBold } from 'react-icons/pi';
import { DeleteConfirmationModal, SkeletonLoader } from '../components';
import InfiniteScrollNotifications from './components/InfiniteScrollNotifications';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIndividualDeleteModal, setShowIndividualDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Track current tab state
  const [currentTab, setCurrentTab] = useState('all');
  
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Get unread count from the API
  const { data: unreadCountData } = useGetUnreadCountQuery(currentAdmin?.id, {
    skip: !currentAdmin?.id
  });

  // Get a small sample of notifications to calculate type-specific counts
  const { data: sampleNotificationsData } = useGetNotificationsQuery(
    { 
      adminId: currentAdmin?.id, 
      limit: 100, // Get more for better count accuracy
      offset: 0
    },
    { skip: !currentAdmin?.id }
  );

  // Calculate unread counts for each tab
  const getUnreadCount = (tabType) => {
    if (!sampleNotificationsData?.notifications) return 0;
    
    const notifications = sampleNotificationsData.notifications;
    
    const filtered = notifications.filter(notification => {
      const isUnread = !notification.is_read;
      if (!isUnread) return false;
      
      switch (tabType) {
        case 'submissions':
          return notification.type === 'approval' || notification.type === 'decline';
        case 'messages':
          return notification.type === 'message';
        case 'all':
        default:
          return true; // 'all' counts all unread
      }
    });
    
    return filtered.length;
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    // Tab change will automatically reset the infinite scroll component
    // The InfiniteScrollNotifications component handles tab changes internally
  };

  // Handle notification selection
  const handleNotificationSelect = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Handle cancel selection
  const handleCancelSelection = () => {
    setSelectedNotifications([]);
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead({ notificationId, adminId: currentAdmin?.id });
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(currentAdmin?.id);
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification({ notificationId, adminId: currentAdmin?.id });
      // The mutation will automatically invalidate the cache and refresh the data
      setShowIndividualDeleteModal(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle individual delete confirmation
  const handleIndividualDeleteClick = (notification) => {
    setNotificationToDelete(notification);
    setShowIndividualDeleteModal(true);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      for (const notificationId of selectedNotifications) {
        await deleteNotification({ notificationId, adminId: currentAdmin?.id });
      }
      setSelectedNotifications([]);
      setShowDeleteModal(false);
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'approval':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="2" />
          </svg>
        );
      case 'decline':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'message':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22,6 12,13 2,6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
    }
  };

  // Loading state for when admin is not available
  if (!currentAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Notifications</h1>
        </div>
        <SkeletonLoader type="table" count={8} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Notifications</h1>
      </div>
      
      <div className={styles.headerActions}>
        {selectedNotifications.length > 0 && (
          <>
            <button 
              className={styles.deleteSelectedBtn}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Selected ({selectedNotifications.length})
            </button>
            <button 
              className={styles.cancelSelectionBtn}
              onClick={handleCancelSelection}
              title="Cancel selection"
            >
              <FiX size={16} />
            </button>
          </>
        )}
        <button 
          className={styles.markAllReadBtn}
          onClick={handleMarkAllAsRead}
        >
          <PiChecksBold size={16} />
          Mark All as Read
        </button>
      </div>
      
      {/* Navigation Tabs */}
      <div className={styles.navTabs}>
        <button 
          className={`${styles.navTab} ${currentTab === 'all' ? styles.active : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <span>View all</span>
          <span className={styles.tabCount}>{getUnreadCount('all')}</span>
        </button>
        <button 
          className={`${styles.navTab} ${currentTab === 'submissions' ? styles.active : ''}`}
          onClick={() => handleTabChange('submissions')}
        >
          <span>Submissions</span>
          <span className={styles.tabCount}>{getUnreadCount('submissions')}</span>
        </button>

        <button 
          className={`${styles.navTab} ${currentTab === 'messages' ? styles.active : ''}`}
          onClick={() => handleTabChange('messages')}
        >
          <span>Messages</span>
          <span className={styles.tabCount}>{getUnreadCount('messages')}</span>
        </button>
      </div>

      <div className={styles.content}>
        <InfiniteScrollNotifications
          currentTab={currentTab}
          onNotificationSelect={handleNotificationSelect}
          selectedNotifications={selectedNotifications}
          onMarkAsRead={handleMarkAsRead}
          onDeleteClick={handleIndividualDeleteClick}
          getNotificationIcon={getNotificationIcon}
        />
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemName={`${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`}
        itemType="notification"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={false}
      />

      {/* Individual Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showIndividualDeleteModal}
        itemName={notificationToDelete?.title || 'this notification'}
        itemType="notification"
        onConfirm={() => handleDeleteNotification(notificationToDelete?.id)}
        onCancel={() => {
          setShowIndividualDeleteModal(false);
          setNotificationToDelete(null);
        }}
        isDeleting={false}
      />
    </div>
  );
}
