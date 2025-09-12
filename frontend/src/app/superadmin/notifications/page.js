'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentSuperAdmin } from '../../../rtk/superadmin/adminSlice';
import { 
  useGetSuperAdminNotificationsQuery, 
  useGetSuperAdminUnreadCountQuery,
  useMarkSuperAdminAsReadMutation,
  useMarkAllSuperAdminAsReadMutation,
  useDeleteSuperAdminNotificationMutation 
} from '../../../rtk/superadmin/superadminNotificationsApi';
import { FiX, FiTrash2 } from 'react-icons/fi';
import { PiChecksBold } from 'react-icons/pi';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SkeletonLoader from '../../admin/components/SkeletonLoader';
import InfiniteScrollSuperAdminNotifications from './components/InfiniteScrollSuperAdminNotifications';
import styles from './notifications.module.css';

export default function SuperAdminNotificationsPage() {
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIndividualDeleteModal, setShowIndividualDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  
  const currentSuperAdmin = useSelector(selectCurrentSuperAdmin);
  
  // Track current tab state
  const [currentTab, setCurrentTab] = useState('all');
  
  const [markAsRead] = useMarkSuperAdminAsReadMutation();
  const [markAllAsRead] = useMarkAllSuperAdminAsReadMutation();
  const [deleteNotification] = useDeleteSuperAdminNotificationMutation();

  // Get superadmin ID from localStorage
  const [superAdminId, setSuperAdminId] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const superAdminData = localStorage.getItem('superAdminData');
      console.log('SuperAdmin data from localStorage:', superAdminData);
      if (superAdminData) {
        try {
          const parsedData = JSON.parse(superAdminData);
          console.log('Parsed superadmin data:', parsedData);
          setSuperAdminId(parsedData.id);
        } catch (error) {
          console.error('Error parsing superadmin data:', error);
        }
      }
    }
  }, []);

  // Get unread count from the API
  const { data: unreadCountData, error: unreadCountError } = useGetSuperAdminUnreadCountQuery(superAdminId, {
    skip: !superAdminId
  });

  // Get a small sample of notifications to calculate type-specific counts
  const { data: sampleNotificationsData, error: sampleError } = useGetSuperAdminNotificationsQuery(
    { 
      superAdminId: superAdminId, 
      limit: 100, // Get more for better count accuracy
      offset: 0
    },
    { skip: !superAdminId }
  );

  // Debug logging
  useEffect(() => {
    console.log('SuperAdmin ID:', superAdminId);
    console.log('Unread count data:', unreadCountData);
    console.log('Unread count error:', unreadCountError);
    console.log('Sample notifications data:', sampleNotificationsData);
    console.log('Sample notifications error:', sampleError);
  }, [superAdminId, unreadCountData, unreadCountError, sampleNotificationsData, sampleError]);

  // Calculate unread counts for each tab
  const getUnreadCount = (tabType) => {
    if (!sampleNotificationsData?.notifications) return 0;
    
    const notifications = sampleNotificationsData.notifications;
    
    const filtered = notifications.filter(notification => {
      const isUnread = !notification.is_read;
      if (!isUnread) return false;
      
      switch (tabType) {
        case 'submissions':
          return notification.type === 'approval_request' || notification.type === 'decline';
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
    // The InfiniteScrollSuperAdminNotifications component handles tab changes internally
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
      await markAsRead({ notificationId, superAdminId: superAdminId });
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(superAdminId);
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification({ notificationId, superAdminId: superAdminId });
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
        await deleteNotification({ notificationId, superAdminId: superAdminId });
      }
      setSelectedNotifications([]);
      setShowDeleteModal(false);
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
    }
  };

  // Notification icon function removed

  // Loading state for when superadmin ID is not available
  if (!superAdminId) {
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
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Notifications</h1>
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
        
        <p className={styles.subheader}>
          {unreadCountData?.count > 0 
            ? `${unreadCountData.count} unread notification${unreadCountData.count !== 1 ? 's' : ''}` 
            : 'No unread notifications'
          }
        </p>
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
        <InfiniteScrollSuperAdminNotifications
          currentTab={currentTab}
          onNotificationSelect={handleNotificationSelect}
          selectedNotifications={selectedNotifications}
          onMarkAsRead={handleMarkAsRead}
          onDeleteClick={handleIndividualDeleteClick}
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
