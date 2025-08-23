//db table: notifications

import db from '../../database.js';

class NotificationController {
  // Get all notifications for an admin
  static async getNotifications(req, res) {
    try {
      const { adminId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      // Get total count first
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM notifications WHERE admin_id = ?',
        [adminId]
      );
      const total = countResult[0].total;

      // Get notifications with pagination
      const query = `
        SELECT id, type, title, message, section, submission_id, is_read, created_at
        FROM notifications 
        WHERE admin_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const [notifications] = await db.execute(query, [adminId, parseInt(limit), parseInt(offset)]);

      // Format the time ago for each notification
      const formattedNotifications = notifications.map(notification => ({
        ...notification,
        timeAgo: NotificationController.getTimeAgo(notification.created_at)
      }));

      res.json({
        success: true,
        notifications: formattedNotifications,
        total: total
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { adminId } = req.body;

      const query = `
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = ? AND admin_id = ?
      `;

      const [result] = await db.execute(query, [notificationId, adminId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  // Mark all notifications as read for an admin
  static async markAllAsRead(req, res) {
    try {
      const { adminId } = req.params;

      const query = `
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE admin_id = ? AND is_read = FALSE
      `;

      await db.execute(query, [adminId]);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read'
      });
    }
  }

  // Get unread notification count
  static async getUnreadCount(req, res) {
    try {
      const { adminId } = req.params;

      const query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE admin_id = ? AND is_read = FALSE
      `;

      const [result] = await db.execute(query, [adminId]);

      res.json({
        success: true,
        count: result[0].count
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread count'
      });
    }
  }

  // Delete a notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { adminId } = req.body;

      const query = `
        DELETE FROM notifications 
        WHERE id = ? AND admin_id = ?
      `;

      const [result] = await db.execute(query, [notificationId, adminId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }

  // Static method to create notification (used by other controllers)
  static async createNotification(adminId, type, title, message, section = null, submissionId = null) {
    try {
      const query = `
        INSERT INTO notifications (admin_id, type, title, message, section, submission_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [adminId, type, title, message, section, submissionId]);

      return {
        success: true,
        notificationId: result.insertId
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper method to format time ago
  static getTimeAgo(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }
}

export default NotificationController;
