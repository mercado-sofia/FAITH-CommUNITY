import db from '../../database.js';
import { getOrganizationLogoUrl } from '../../utils/imageUrlUtils.js';
import { logError } from '../../utils/logger.js';

class SuperAdminNotificationController {
  static async getNotifications(req, res) {
    try {
      const { superAdminId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      if (!superAdminId || isNaN(parseInt(superAdminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid superadmin ID'
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

      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM superadmin_notifications WHERE superadmin_id = ?',
        [superAdminId]
      );
      const total = countResult[0].total;

      // MySQL2 has issues with LIMIT and OFFSET as placeholders, so we interpolate them directly
      // Safe because limitNum and offsetNum are validated numbers
      const query = `
        SELECT 
          sn.id, 
          sn.type, 
          sn.title, 
          sn.message, 
          sn.message_template,
          sn.section, 
          sn.submission_id, 
          sn.organization_id,
          sn.is_read, 
          sn.created_at,
          o.org as organization_acronym,
          o.orgName as organization_name,
          o.logo as orgLogo,
          o.org_color as organization_color
        FROM superadmin_notifications sn
        LEFT JOIN organizations o ON sn.organization_id = o.id
        WHERE sn.superadmin_id = ? 
        ORDER BY sn.created_at DESC 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const [notifications] = await db.execute(query, [superAdminId]);

      // Format the time ago, logo URL, and generate dynamic messages for each notification
      const formattedNotifications = notifications.map(notification => {
        // Generate dynamic message using current organization acronym
        let dynamicMessage = notification.message; // fallback to original message
        
        if (notification.message_template && notification.organization_acronym) {
          // Replace {ORG_ACRONYM} placeholder with current organization acronym
          dynamicMessage = notification.message_template.replace('{ORG_ACRONYM}', notification.organization_acronym);
        } else if (notification.message_template && !notification.organization_acronym) {
          // If no organization data (deleted organization), replace with fallback
          dynamicMessage = notification.message_template.replace('{ORG_ACRONYM}', 'Unknown Organization');
        }

        // Construct proper logo URL from stored logo
        let logoUrl = null;
        if (notification.orgLogo) {
          if (notification.orgLogo.includes('/')) {
            logoUrl = getOrganizationLogoUrl(notification.orgLogo);
          }
        } else if (notification.organization_acronym) {
          // Fallback to expected logo path
          logoUrl = `/logo/${notification.organization_acronym.toLowerCase()}_logo.jpg`;
        }

        return {
          ...notification,
          message: dynamicMessage, // Use the dynamically generated message
          timeAgo: SuperAdminNotificationController.getTimeAgo(notification.created_at),
          orgLogo: logoUrl
        };
      });

      res.json({
        success: true,
        notifications: formattedNotifications,
        total: total
      });
    } catch (error) {
      // Log the error for debugging
      logError('Error fetching superadmin notifications', error, {
        context: 'superadmin_notification_controller',
        superAdminId: req.params?.superAdminId,
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
      const { superAdminId } = req.body;

      // Validate inputs
      if (!notificationId || isNaN(parseInt(notificationId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID'
        });
      }

      if (!superAdminId || isNaN(parseInt(superAdminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid superadmin ID'
        });
      }

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
      logError('Error marking notification as read', error, {
        context: 'superadmin_notification_controller',
        notificationId: req.params?.notificationId,
        superAdminId: req.body?.superAdminId,
        errorStack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req, res) {
    try {
      const { superAdminId } = req.params;

      // Validate superAdminId
      if (!superAdminId || isNaN(parseInt(superAdminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid superadmin ID'
        });
      }

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
      logError('Error marking all notifications as read', error, {
        context: 'superadmin_notification_controller',
        superAdminId: req.params?.superAdminId,
        errorStack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const { superAdminId } = req.body;

      // Validate inputs
      if (!notificationId || isNaN(parseInt(notificationId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID'
        });
      }

      if (!superAdminId || isNaN(parseInt(superAdminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid superadmin ID'
        });
      }

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
      logError('Error deleting notification', error, {
        context: 'superadmin_notification_controller',
        notificationId: req.params?.notificationId,
        superAdminId: req.body?.superAdminId,
        errorStack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get unread count
  static async getUnreadCount(req, res) {
    try {
      const { superAdminId } = req.params;

      // Validate superAdminId
      if (!superAdminId || isNaN(parseInt(superAdminId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid superadmin ID'
        });
      }

      const [result] = await db.execute(
        'SELECT COUNT(*) as count FROM superadmin_notifications WHERE superadmin_id = ? AND is_read = 0',
        [superAdminId]
      );

      res.json({
        success: true,
        count: result[0].count
      });
    } catch (error) {
      logError('Error getting unread notification count', error, {
        context: 'superadmin_notification_controller',
        superAdminId: req.params?.superAdminId,
        errorStack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Static method to create notification (used by other controllers)
  static async createNotification(superAdminId, type, title, message, section = null, submissionId = null, organizationId = null) {
    try {
      // Create message template by removing organization name from the message
      let messageTemplate = message;
      
      // If organizationId is provided, try to extract the current org name and create a template
      if (organizationId) {
        try {
          const [orgResult] = await db.execute(
            'SELECT org FROM organizations WHERE id = ?',
            [organizationId]
          );
          
          if (orgResult.length > 0) {
            const currentOrgName = orgResult[0].org;
            // Replace the current org name with a placeholder
            messageTemplate = message.replace(currentOrgName, '{ORG_ACRONYM}');
          }
        } catch (orgError) {
          // Could not extract org name for template, using original message
        }
      }

      const query = `
        INSERT INTO superadmin_notifications (superadmin_id, type, title, message, message_template, section, submission_id, organization_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [superAdminId, type, title, message, messageTemplate, section, submissionId, organizationId]);

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
