'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { useDropdown } from '@/hooks/useDropdown';
import styles from './styles/NotificationsDropdown.module.css';
import { FaBell } from 'react-icons/fa';

export default function NotificationsDropdown({ isAuthenticated, profileDropdown }) {
  const router = useRouter();
  const notificationsDropdown = useDropdown(false);
  const notifications = useNotifications(isAuthenticated);

  const handleNotificationsToggle = () => {
    if (profileDropdown.isOpen) {
      profileDropdown.close();
    }
    notificationsDropdown.toggle();
    
    // Hide notification badge when dropdown is opened
    if (!notificationsDropdown.isOpen) {
      // Mark all notifications as viewed when opening dropdown
      notifications.notifications.forEach(notification => {
        if (!notification.isRead) {
          notifications.handleNotificationClick(notification);
        }
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.notificationWrapper} ref={notificationsDropdown.ref}>
      <button 
        className={styles.notificationBtn}
        onClick={handleNotificationsToggle}
      >
        <FaBell />
        {notifications.hasUnreadNotifications && (
          <span className={styles.notificationBadge}></span>
        )}
      </button>
      
      {/* Notifications Dropdown */}
      {notificationsDropdown.isOpen && (
        <div className={styles.notificationsDropdown}>
          <div className={styles.notificationsHeader}>
            <h3>Notifications</h3>
          </div>
          <div className={styles.notificationsList}>
            {notifications.isLoading ? (
              <div className={styles.notificationItem}>
                <div className={styles.notificationContent}>
                  <p className={styles.notificationText}>Loading notifications...</p>
                </div>
              </div>
            ) : notifications.notifications.length === 0 ? (
              <div className={styles.notificationItem}>
                <div className={styles.notificationContent}>
                  <p className={styles.notificationText}>No notifications yet</p>
                </div>
              </div>
            ) : (
              notifications.notifications.map((notification) => {
                // Debug: log the notification data
                console.log('Notification:', notification.id, 'isRead:', notification.isRead, 'type:', typeof notification.isRead);
                
                return (
                  <div 
                    key={notification.id} 
                    className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                    onClick={() => {
                      notifications.handleNotificationClick(notification);
                      notificationsDropdown.close();
                      router.push('/profile?tab=notifications');
                    }}
                  >
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationText}>{notification.title}</p>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <span className={styles.notificationTime}>
                      {notifications.formatNotificationTime(notification.created_at)}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
          <div className={styles.notificationsFooter}>
            <Link 
              href="/profile?tab=notifications" 
              className={styles.viewAllBtn}
              onClick={notificationsDropdown.close}
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
