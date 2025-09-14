//db table: superadmin_notifications

import db from '../../database.js';

class SuperAdminNotificationController {
  // Test endpoint to check notifications
  static async testNotifications(req, res) {
    try {
      const { superAdminId } = req.params;
      
      // Check if there are any notifications
      const [notifications] = await db.execute(
        'SELECT * FROM superadmin_notifications WHERE superadmin_id = ? ORDER BY created_at DESC LIMIT 5',
        [superAdminId]
      );
      
      // Check organizations table
      const [organizations] = await db.execute(
        'SELECT id, logo FROM organizations LIMIT 5'
      );
      
      // Check admins table
      const [admins] = await db.execute(
        'SELECT id, org, organization_id FROM admins LIMIT 5'
      );
      
      res.json({
        success: true,
        notifications: notifications,
        organizations: organizations,
        admins: admins,
        message: 'Test data retrieved successfully'
      });
    } catch (error) {
      console.error('Error in testNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test data',
        error: error.message
      });
    }
  }

  // Create test notification
  static async createTestNotification(req, res) {
    try {
      const { superAdminId } = req.params;
      
      // Create a test notification
      const testNotification = await SuperAdminNotificationController.createNotification(
        superAdminId,
        'approval_request',
        'Test Notification',
        'This is a test notification to verify the system is working.',
        'competency',
        null,
        'TEST'
      );
      
      res.json({
        success: true,
        notification: testNotification,
        message: 'Test notification created successfully'
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test notification',
        error: error.message
      });
    }
  }

  // Get all notifications for a superadmin
  static async getNotifications(req, res) {
    try {
      const { superAdminId } = req.params;
      const { limit = 10, offset = 0 } = req.query;


      // Get total count first
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM superadmin_notifications WHERE superadmin_id = ?',
        [superAdminId]
      );
      const total = countResult[0].total;

      // Get notifications with pagination and organization logo
      const query = `
        SELECT 
          sn.id, 
          sn.type, 
          sn.title, 
          sn.message, 
          sn.section, 
          sn.submission_id, 
          sn.organization_acronym, 
          sn.is_read, 
          sn.created_at,
          o.logo as organization_logo
        FROM superadmin_notifications sn
        LEFT JOIN organizations o ON sn.organization_acronym = o.org
        WHERE sn.superadmin_id = ? 
        ORDER BY sn.created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const [notifications] = await db.execute(query, [superAdminId, parseInt(limit), parseInt(offset)]);
      

      // Format the time ago and logo URL for each notification
      const formattedNotifications = notifications.map(notification => {

        // Construct proper logo URL
        let logoUrl = null;
        if (notification.organization_logo) {
          if (notification.organization_logo.includes('/')) {
            // Legacy path - extract filename
            const filename = notification.organization_logo.split('/').pop();
            logoUrl = `/uploads/organizations/logos/${filename}`;
          } else {
            // New structure - direct filename
            logoUrl = `/uploads/organizations/logos/${notification.organization_logo}`;
          }
        } else if (notification.organization_acronym) {
          // Fallback to expected logo path
          logoUrl = `/logo/${notification.organization_acronym.toLowerCase()}_logo.jpg`;
        }


        return {
          ...notification,
          timeAgo: SuperAdminNotificationController.getTimeAgo(notification.created_at),
          organization_logo: logoUrl
        };
      });

      res.json({
        success: true,
        notifications: formattedNotifications,
        total: total
      });
    } catch (error) {
      console.error('Error fetching superadmin notifications:', error);
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
      const { superAdminId } = req.body;

      const query = `
        UPDATE superadmin_notifications 
        SET is_read = 1 
        WHERE id = ? AND superadmin_id = ?
      `;

      const [result] = await db.execute(query, [notificationId, superAdminId]);

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

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const { superAdminId } = req.params;

      const query = `
        UPDATE superadmin_notifications 
        SET is_read = 1 
        WHERE superadmin_id = ? AND is_read = 0
      `;

      const [result] = await db.execute(query, [superAdminId]);

      res.json({
        success: true,
        message: `${result.affectedRows} notifications marked as read`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { superAdminId } = req.body;

      const query = `
        DELETE FROM superadmin_notifications 
        WHERE id = ? AND superadmin_id = ?
      `;

      const [result] = await db.execute(query, [notificationId, superAdminId]);

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

  // Get unread count
  static async getUnreadCount(req, res) {
    try {
      const { superAdminId } = req.params;

      const [result] = await db.execute(
        'SELECT COUNT(*) as count FROM superadmin_notifications WHERE superadmin_id = ? AND is_read = 0',
        [superAdminId]
      );

      res.json({
        success: true,
        count: result[0].count
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }

  // Static method to create notification (used by other controllers)
  static async createNotification(superAdminId, type, title, message, section = null, submissionId = null, organizationAcronym = null) {
    try {
      const query = `
        INSERT INTO superadmin_notifications (superadmin_id, type, title, message, section, submission_id, organization_acronym)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [superAdminId, type, title, message, section, submissionId, organizationAcronym]);

      return {
        success: true,
        notificationId: result.insertId
      };
    } catch (error) {
      console.error('Error creating superadmin notification:', error);
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
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
}

export default SuperAdminNotificationController;
