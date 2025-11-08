'use client';

import { useState, useEffect } from 'react';
import { 
  useGetSuperAdminNotificationsQuery, 
  useGetSuperAdminUnreadCountQuery,
  useMarkSuperAdminAsReadMutation,
  useMarkAllSuperAdminAsReadMutation,
  useDeleteSuperAdminNotificationMutation 
} from '../../../rtk/superadmin/superadminNotificationsApi';
import { FiTrash2 } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { PiChecksBold } from 'react-icons/pi';
import { ConfirmationModal } from '@/components';
import { SkeletonLoader } from '../components';
import InfiniteScrollSuperAdminNotifications from './components/InfiniteScrollSuperAdminNotifications';
import { logError } from '@/config/api';
import styles from './notifications.module.css';

export default function SuperAdminNotificationsPage() {
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIndividualDeleteModal, setShowIndividualDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  
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
      if (superAdminData) {
        try {
          const parsedData = JSON.parse(superAdminData);
          setSuperAdminId(parsedData.id);
        } catch (error) {
          logError(error, { context: 'parseSuperAdminData' });
          // Failed to parse superAdminData, will show loading state
        }
      }
    }
  }, []);

  // Get unread count from the API
  const { data: unreadCountData } = useGetSuperAdminUnreadCountQuery(superAdminId, {
    skip: !superAdminId
  });

  // Get a small sample of notifications to calculate type-specific counts
  const { data: sampleNotificationsData } = useGetSuperAdminNotificationsQuery(
    { 
      superAdminId: superAdminId, 
      limit: 100, // Get more for better count accuracy
      offset: 0
    },
    { skip: !superAdminId }
  );


  // Calculate counts for each tab
  const getTabCount = (tabType) => {
    if (!sampleNotificationsData?.notifications) return 0;
    
    const notifications = sampleNotificationsData.notifications;
    
    const filtered = notifications.filter(notification => {
      switch (tabType) {
        case 'unread':
          return !notification.is_read; // Only unread notifications
        case 'all':
        default:
          return true; // All notifications (read and unread)
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

  // Handle select all notifications
  const handleSelectAll = () => {
    if (!sampleNotificationsData?.notifications) return;
    
    const notifications = sampleNotificationsData.notifications;
    
    // Filter notifications based on current tab
    const filtered = notifications.filter(notification => {
      switch (currentTab) {
        case 'unread':
          return !notification.is_read;
        case 'all':
        default:
          return true;
      }
    });
    
    // Get all notification IDs
    const allIds = filtered.map(n => n.id);
    
    // Check if all are already selected
    const allSelected = allIds.length > 0 && allIds.every(id => selectedNotifications.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedNotifications([]);
    } else {
      // Select all
      setSelectedNotifications(allIds);
    }
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
      logError(error, { context: 'handleMarkAsRead', notificationId });
      // Error is handled by RTK Query, user will see it in the UI
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(superAdminId);
      // The mutation will automatically invalidate the cache and refresh the data
    } catch (error) {
      logError(error, { context: 'handleMarkAllAsRead', superAdminId });
      // Error is handled by RTK Query, user will see it in the UI
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
      logError(error, { context: 'handleDeleteNotification', notificationId });
      // Error is handled by RTK Query, user will see it in the UI
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
      logError(error, { context: 'handleBulkDelete', notificationIds: selectedNotifications });
      // Error is handled by RTK Query, user will see it in the UI
    }
  };


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
            <button 
              className={styles.selectAllBtn}
              onClick={handleSelectAll}
            >
              <PiChecksBold size={16} />
              {(() => {
                if (!sampleNotificationsData?.notifications) return 'Select All';
                const notifications = sampleNotificationsData.notifications;
                const filtered = notifications.filter(notification => {
                  switch (currentTab) {
                    case 'unread':
                      return !notification.is_read;
                    case 'all':
                    default:
                      return true;
                  }
                });
                const allIds = filtered.map(n => n.id);
                const allSelected = allIds.length > 0 && allIds.every(id => selectedNotifications.includes(id));
                return allSelected ? 'Deselect All' : 'Select All';
              })()}
            </button>
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
          <span className={styles.tabCount}>{getTabCount('all')}</span>
        </button>
        <button 
          className={`${styles.navTab} ${currentTab === 'unread' ? styles.active : ''}`}
          onClick={() => handleTabChange('unread')}
        >
          <span>Unread</span>
          <span className={styles.tabCount}>{getTabCount('unread')}</span>
        </button>

      </div>

      <div className={styles.content}>
        {/* Bulk Actions Bar */}
        {selectedNotifications.length > 0 && (
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkActionsLeft}>
              <span className={styles.selectedCount}>
                {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className={styles.bulkActionsRight}>
              <button 
                className={`${styles.bulkButton} ${styles.deleteButton}`}
                onClick={() => setShowDeleteModal(true)}
                title="Delete selected notifications"
              >
                <FiTrash2 size={16} />
                Delete Selected
              </button>
              <button 
                className={styles.cancelSelectionBtn}
                onClick={handleCancelSelection}
                title="Cancel selection"
              >
                <IoCloseOutline />
              </button>
            </div>
          </div>
        )}

        <InfiniteScrollSuperAdminNotifications
          currentTab={currentTab}
          onNotificationSelect={handleNotificationSelect}
          selectedNotifications={selectedNotifications}
          onMarkAsRead={handleMarkAsRead}
          onDeleteClick={handleIndividualDeleteClick}
          allNotifications={sampleNotificationsData?.notifications || []}
        />
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={`${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`}
        itemType="notification"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={false}
      />

      {/* Individual Delete Confirmation Modal */}
      <ConfirmationModal
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
