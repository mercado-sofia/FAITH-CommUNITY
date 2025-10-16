import express from 'express';
import SuperAdminNotificationController from '../controllers/superadminNotificationController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// SECURITY FIX: All notification routes require superadmin authentication
router.use(verifySuperadminToken);

// Test endpoint
router.get('/test/:superAdminId', SuperAdminNotificationController.testNotifications);

// Create test notification
router.post('/test/:superAdminId', SuperAdminNotificationController.createTestNotification);

// Get all notifications for a superadmin
router.get('/:superAdminId', SuperAdminNotificationController.getNotifications);

// Get unread count
router.get('/:superAdminId/unread-count', SuperAdminNotificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', SuperAdminNotificationController.markAsRead);

// Mark all notifications as read
router.put('/:superAdminId/mark-all-read', SuperAdminNotificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', SuperAdminNotificationController.deleteNotification);


export default router;
