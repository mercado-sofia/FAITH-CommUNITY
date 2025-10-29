'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useNotifications } from '@/hooks/useNotifications';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useDropdown } from '@/hooks/useDropdown';
import { useAuthState } from '@/hooks/useAuthState';
import { selectCurrentAdmin, selectUserType } from '@/rtk/superadmin/adminSlice';
import styles from './styles/NotificationsDropdown.module.css';
import { FaBell } from 'react-icons/fa';

export default function NotificationsDropdown({ isAuthenticated, profileDropdown }) {
  const router = useRouter();
  const notificationsDropdown = useDropdown(false);
  const { user } = useAuthState();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const userType = useSelector(selectUserType);
  
  // Use appropriate notification hook based on user type
  const isAdmin = userType === 'admin' || userType === 'superadmin';
  
  const userNotifications = useNotifications(isAuthenticated && !isAdmin);
  const adminNotifications = useAdminNotifications(isAuthenticated && isAdmin ? currentAdmin?.id : null);
  
  // Use the appropriate notification data
  const notifications = isAdmin ? adminNotifications : userNotifications;

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
                // Handle different data structures between user and admin notifications
                const isRead = notification.is_read !== undefined ? notification.is_read : notification.isRead;
                const createdAt = notification.created_at || notification.createdAt;
                
                return (
                  <div 
                    key={notification.id} 
                    className={`${styles.notificationItem} ${!isRead ? styles.unread : ''}`}
                    onClick={() => {
                      notifications.handleNotificationClick(notification);
                      notificationsDropdown.close();
                      
                      // Handle collaboration notifications specially
                      if (isAdmin && (notification.type === 'collaboration_request' || notification.type === 'collaboration' || notification.type === 'program_approval')) {
                        router.push('/admin/programs?tab=collaborations');
                      } else if (isAdmin) {
                        router.push('/admin/notifications');
                      } else {
                        router.push('/profile?tab=notifications');
                      }
                    }}
                  >
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationText}>{notification.title}</p>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <span className={styles.notificationTime}>
                      {notifications.formatNotificationTime(createdAt)}
                    </span>
                  </div>
                </div>
                );
              })
            )}
          </div>
          <div className={styles.notificationsFooter}>
            <Link 
              href={isAdmin ? "/admin/notifications" : "/profile?tab=notifications"} 
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
