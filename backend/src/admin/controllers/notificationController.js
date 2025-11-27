import db from '../../database.js';
import { logError } from '../../utils/logger.js';

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const { adminId } = req.params;
      const { limit = 10, offset = 0, tab = 'all' } = req.query;

      if (!adminId || isNaN(parseInt(adminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin ID'
        });
      }

      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid limit. Must be between 1 and 100'
        });
      }
      
      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid offset. Must be 0 or greater'
        });
      }

      let whereClause = 'admin_id = ?';
      let queryParams = [adminId];

      if (tab !== 'all') {
        switch (tab) {
          case 'submissions':
            whereClause += ' AND (type = ? OR type = ?)';
            queryParams.push('approval', 'decline');
            break;
          case 'collaborations':
            whereClause += ' AND (type = ? OR type = ? OR type = ? OR type = ? OR type = ?)';
            queryParams.push('collaboration', 'program_approval', 'collaboration_request', 'collaboration_accepted', 'program_declined');
            break;
          case 'messages':
            whereClause += ' AND type = ?';
            queryParams.push('message');
            break;
        }
      }

      const countQuery = `SELECT COUNT(*) as total FROM admin_notifications WHERE ${whereClause}`;
      const [countResult] = await db.execute(countQuery, queryParams);
      const total = countResult[0].total;

      const query = `
        SELECT 
          an.id, 
          an.type, 
          an.title, 
          an.message, 
          an.section, 
          an.submission_id, 
          an.is_read, 
          an.created_at,
          CASE 
            WHEN an.type = 'message' THEN
              COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))), ''),
                NULLIF(TRIM(CONCAT(COALESCE(up_by_email.first_name, ''), ' ', COALESCE(up_by_email.last_name, ''))), ''),
                'Guest User'
              )
            ELSE NULL
          END as sender_name,
          m.user_id as message_user_id,
          m.sender_email as message_sender_email
        FROM admin_notifications an
        LEFT JOIN messages m ON an.type = 'message' AND an.submission_id = m.id
        LEFT JOIN users u ON m.user_id = u.id AND u.is_active = 1 AND u.role = 'user'
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN users u_by_email ON an.type = 'message' AND m.sender_email IS NOT NULL AND LOWER(m.sender_email) = LOWER(u_by_email.email) AND u_by_email.is_active = 1 AND u_by_email.role = 'user'
        LEFT JOIN user_profiles up_by_email ON u_by_email.id = up_by_email.user_id
        WHERE ${whereClause}
        ORDER BY an.created_at DESC 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const [notifications] = await db.execute(query, queryParams);

      // Format the time ago for each notification and update message text for message notifications
      const formattedNotifications = notifications.map(notification => {
        let message = notification.message;
        
        // For message notifications, replace "Guest User" with the actual sender name if available
        if (notification.type === 'message' && notification.sender_name) {
          const senderName = notification.sender_name.trim();
          if (senderName && senderName !== 'Guest User') {
            // Replace "Guest User" in the message with the actual sender name
            message = message.replace(/Guest User/g, senderName);
            // Also handle cases where the message might already have the name but we want to ensure it's correct
            // Extract the name from "You have received a new message from {name}."
            const messageMatch = message.match(/You have received a new message from (.+)\./);
            if (messageMatch && messageMatch[1] === 'Guest User') {
              message = `You have received a new message from ${senderName}.`;
            } else if (!messageMatch) {
              // If the pattern doesn't match, just replace Guest User
              message = message.replace(/Guest User/g, senderName);
            }
          }
        }
        
        return {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: message,
          section: notification.section,
          submission_id: notification.submission_id,
          is_read: notification.is_read,
          created_at: notification.created_at,
          timeAgo: NotificationController.getTimeAgo(notification.created_at)
        };
      });

      res.json({
        success: true,
        notifications: formattedNotifications,
        total: total
      });
    } catch (error) {
      // Log the error for debugging
      logError('Error fetching admin notifications', error, {
        context: 'admin_notification_controller',
        adminId: req.params?.adminId,
        limit: req.query?.limit,
        offset: req.query?.offset,
        tab: req.query?.tab,
        errorStack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const { adminId } = req.body;

      const query = `
        UPDATE admin_notifications 
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
        UPDATE admin_notifications 
        SET is_read = TRUE 
        WHERE admin_id = ? AND is_read = FALSE
      `;

      await db.execute(query, [adminId]);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
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
        FROM admin_notifications 
        WHERE admin_id = ? AND is_read = FALSE
      `;

      const [result] = await db.execute(query, [adminId]);

      res.json({
        success: true,
        count: result[0].count
      });
    } catch (error) {
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
        DELETE FROM admin_notifications 
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
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }

  // Static method to create notification (used by other controllers)
  static async createNotification(adminId, type, title, message, section = null, submissionId = null) {
    try {
      // Validate required parameters
      if (!adminId || !type || !title || !message) {
        throw new Error(`Missing required notification parameters: adminId=${adminId}, type=${type}, title=${title}, message=${message}`);
      }

      const query = `
        INSERT INTO admin_notifications (admin_id, type, title, message, section, submission_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [adminId, type, title, message, section, submissionId]);
      
      return {
        success: true,
        notificationId: result.insertId
      };
    } catch (error) {
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