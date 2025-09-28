'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation 
} from '@/rtk/admin/notificationsApi';
import { FiX, FiXCircle, FiTrash2 } from 'react-icons/fi';
import { PiChecksBold } from 'react-icons/pi';
import { MdCancel } from 'react-icons/md';
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
          return notification.type === 'approval' || notification.type === 'decline' || notification.type === 'program_approval';
        case 'collaborations':
          return notification.type === 'collaboration';
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
        return <FiXCircle size={16} color="#ef4444" />;
      case 'message':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22,6 12,13 2,6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'collaboration':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" stroke="#8b5cf6" strokeWidth="2" />
            <path d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0413 20.9999 15.5754 20.2 15.366" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'program_approval':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" stroke="#059669" strokeWidth="2" />
            <path d="M12 1V3" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 21V23" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M4.22 4.22L5.64 5.64" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.36 18.36L19.78 19.78" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M1 12H3" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 12H23" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M4.22 19.78L5.64 18.36" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.36 5.64L19.78 4.22" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
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
        <div className={styles.headerContent}>
          <h1>Notifications</h1>
          <p className={styles.subheader}>
            {unreadCountData?.count > 0 
              ? `${unreadCountData.count} unread notification${unreadCountData.count !== 1 ? 's' : ''}` 
              : 'No unread notifications'
            }
          </p>
        </div>
        
        <div className={styles.headerActions}>
          {selectedNotifications.length > 0 && (
            <div className={styles.bulkActionsContainer}>
              <button 
                className={styles.deleteSelectedBtn}
                onClick={() => setShowDeleteModal(true)}
              >
                <FiTrash2 size={16} />
                Delete Selected ({selectedNotifications.length})
              </button>
              <button 
                className={styles.cancelSelectionBtn}
                onClick={handleCancelSelection}
                title="Cancel selection"
              >
                <FiX size={16} />
              </button>
            </div>
          )}
          {unreadCountData?.count > 0 && (
            <button 
              className={styles.markAllReadBtn}
              onClick={handleMarkAllAsRead}
            >
              <PiChecksBold size={16} />
              Mark All as Read
            </button>
          )}
        </div>
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
          className={`${styles.navTab} ${currentTab === 'collaborations' ? styles.active : ''}`}
          onClick={() => handleTabChange('collaborations')}
        >
          <span>Collaborations</span>
          <span className={styles.tabCount}>{getUnreadCount('collaborations')}</span>
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
