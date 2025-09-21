'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaBell, FaEnvelope, FaCheck } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { PiWarningOctagonBold } from 'react-icons/pi';
import { getApiUrl, getAuthHeaders } from '../../utils/profileApi';
import { getRelativeTime } from '@/utils/dateUtils';
import styles from './Notifications.module.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setError('');
      const response = await fetch(getApiUrl('/api/users/notifications'), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(getApiUrl(`/api/users/notifications/${notificationId}/read`), {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const handleDeleteClick = (notification) => {
    setNotificationToDelete(notification);
    setShowDeleteModal(true);
    document.body.classList.add(styles.modalOpen);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setNotificationToDelete(null);
    document.body.classList.remove(styles.modalOpen);
  };

  const confirmDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      const response = await fetch(getApiUrl(`/api/users/notifications/${notificationToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationToDelete.id));
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      document.body.classList.remove(styles.modalOpen);
    }
  };

  // Using centralized date utility for consistent relative time formatting
  const formatDate = (dateString) => {
    return getRelativeTime(dateString);
  };

  if (isLoading) {
    return (
      <div className={styles.notificationsSection}>
        <div className={styles.sectionHeader}>
          <h2>Notifications</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.notificationsSection}>
        <div className={styles.sectionHeader}>
          <h2>Notifications</h2>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchNotifications} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.notificationsSection}>
      <div className={styles.sectionHeader}>
        <h2>Notifications</h2>
      </div>


      {/* Notifications List */}
      <div className={styles.notificationsList}>
        <h3>Recent Notifications</h3>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <FaBell className={styles.emptyIcon} />
            <p>No notifications yet</p>
            <span>You&apos;ll see your notifications here when they arrive</span>
          </div>
        ) : (
          <div className={styles.notificationsContainer}>
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`${styles.notificationItem} ${notification.isRead ? styles.read : styles.unread}`}
              >
                <div className={styles.notificationIcon}>
                  {notification.type === 'email' ? <FaEnvelope /> : <FaBell />}
                </div>
                <div className={styles.notificationContent}>
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <span className={styles.notificationDate}>
                    {formatDate(notification.created_at)}
                  </span>
                </div>
                <div className={styles.notificationActions}>
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className={styles.markReadButton}
                      title="Mark as read"
                    >
                      <FaCheck />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteClick(notification)}
                    className={styles.deleteButton}
                    title="Delete notification"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.warningIconContainer}>
                <PiWarningOctagonBold />
              </div>
              <h2 className={styles.modalTitle}>Delete Notification</h2>
            </div>
            
            <div className={styles.confirmDeleteMessage}>
              <p>Are you sure you want to delete this notification? This action cannot be undone.</p>
            </div>

            <div className={styles.confirmDeleteButtons}>
              <button 
                type="button" 
                className={styles.cancelBtn}
                onClick={handleCancelDelete}
                tabIndex="-1"
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.deleteBtn}
                onClick={confirmDeleteNotification}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}