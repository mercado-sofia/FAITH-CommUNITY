'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import { 
  useGetNotificationsQuery, 
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation 
} from '../../../rtk/admin/notificationsApi';
import { FiTrash2, FiX } from 'react-icons/fi';
import { PiChecksBold } from 'react-icons/pi';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showIndividualDeleteModal, setShowIndividualDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Get current tab from URL parameter (default to 'all' if no parameter)
  const currentTab = searchParams.get('tab') || 'all';
  
  // Fetch all notifications with pagination
  const { data: notificationsData, isLoading, refetch } = useGetNotificationsQuery(
    { 
      adminId: currentAdmin?.id, 
      limit: itemsPerPage, 
      offset: (currentPage - 1) * itemsPerPage 
    },
    { skip: !currentAdmin?.id }
  );
  
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  
  const notifications = notificationsData?.notifications || [];
  const totalNotifications = notificationsData?.total || 0;
  const totalPages = Math.ceil(totalNotifications / itemsPerPage);

  // Filter notifications based on current tab
  const filteredNotifications = notifications.filter(notification => {
    switch (currentTab) {
      case 'submissions':
        return notification.type === 'approval' || notification.type === 'decline';

      case 'messages':
        return notification.type === 'message';
      default:
        return true; // 'all' shows everything
    }
  });

  // Calculate unread counts for each tab
  const getUnreadCount = (tabType) => {
    if (!notifications.length) return 0;
    
    const filtered = notifications.filter(notification => {
      switch (tabType) {
        case 'submissions':
          return (notification.type === 'approval' || notification.type === 'decline') && !notification.is_read;

        case 'messages':
          return notification.type === 'message' && !notification.is_read;
        default:
          return !notification.is_read; // 'all' counts all unread
      }
    });
    
    return filtered.length;
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    if (tab === 'all') {
      // For 'all' tab, remove the tab parameter from URL
      router.push('/admin/notifications');
    } else {
      const params = new URLSearchParams(searchParams);
      params.set('tab', tab);
      router.push(`/admin/notifications?${params.toString()}`);
    }
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  // Handle notification selection
  const handleNotificationSelect = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  // Handle cancel selection
  const handleCancelSelection = () => {
    setSelectedNotifications([]);
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead({ notificationId, adminId: currentAdmin?.id });
      refetch();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(currentAdmin?.id);
      refetch();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      setIsDeleting(true);
      await deleteNotification({ notificationId, adminId: currentAdmin?.id });
      refetch();
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsDeleting(false);
      setShowIndividualDeleteModal(false);
      setNotificationToDelete(null);
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
      setIsDeleting(true);
      for (const notificationId of selectedNotifications) {
        await deleteNotification({ notificationId, adminId: currentAdmin?.id });
      }
      setSelectedNotifications([]);
      setShowDeleteModal(false);
      refetch();
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
    } finally {
      setIsDeleting(false);
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
            <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="2" />
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading notifications...</p>
        </div>
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
         {filteredNotifications.length === 0 ? (
            <div className={styles.emptyState}>
               <div className={styles.emptyIcon}>
                 <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                   <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </div>
              <h3>No notifications yet</h3>
              <p>You&apos;re all caught up! New notifications will appear here.</p>
            </div>
        ) : (
          <>
            <div className={styles.notificationsList}>
               {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                >
                  <div className={styles.notificationCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleNotificationSelect(notification.id)}
                    />
                  </div>
                  
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className={styles.notificationContent}>
                                         <div className={styles.notificationHeader}>
                       <h4 className={styles.notificationTitle}>{notification.title}</h4>
                       <div className={styles.notificationTimeContainer}>
                         <span className={styles.notificationTime}>{notification.timeAgo}</span>
                         {!notification.is_read && (
                           <div className={styles.unreadIndicator}></div>
                         )}
                       </div>
                     </div>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    {notification.section && (
                      <span className={styles.notificationSection}>
                        Section: {notification.section}
                      </span>
                    )}
                  </div>
                  
                  <div className={styles.notificationActions}>
                    {!notification.is_read && (
                      <button
                        className={styles.markReadBtn}
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                    <button
                       className={styles.deleteBtn}
                       onClick={() => handleIndividualDeleteClick(notification)}
                       title="Delete notification"
                     >
                       <FiTrash2 size={16} />
                     </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </button>
                
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`${styles.pageBtn} ${currentPage === page ? styles.active : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  className={styles.paginationBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

             {/* Bulk Delete Confirmation Modal */}
       <DeleteConfirmationModal
         isOpen={showDeleteModal}
         itemName={`${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`}
         itemType="notification"
         onConfirm={handleBulkDelete}
         onCancel={() => setShowDeleteModal(false)}
         isDeleting={isDeleting}
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
         isDeleting={isDeleting}
       />
    </div>
  );
}
