//controller: inboxController.js

import express from "express";
import { 
  getMessagesByOrg, 
  markMessageAsRead, 
  markAllMessagesAsRead, 
  deleteMessage, 
  getUnreadCount 
} from "../controllers/inboxController.js";
import { verifyAdminToken } from '../controllers/adminAuthController.js';

const router = express.Router();

// SECURITY FIX: All inbox routes require admin authentication
router.use(verifyAdminToken);

// Get messages for an organization (admin inbox)
router.get("/:organization_id", getMessagesByOrg);

// Get unread message count
router.get("/:organization_id/unread-count", getUnreadCount);

// Mark message as read
router.patch("/:message_id/read", markMessageAsRead);

// Mark all messages as read for an organization
router.patch("/:organization_id/mark-all-read", markAllMessagesAsRead);

// Delete a message
router.delete("/:message_id", deleteMessage);

export default router;