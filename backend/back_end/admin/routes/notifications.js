import express from 'express';
const router = express.Router();
import NotificationController from '../controllers/notificationController.js';

// Get all notifications for an admin
router.get('/:adminId', NotificationController.getNotifications);

// Get unread notification count
router.get('/:adminId/unread-count', NotificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', NotificationController.markAsRead);

// Mark all notifications as read for an admin
router.put('/:adminId/mark-all-read', NotificationController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', NotificationController.deleteNotification);

export default router;
