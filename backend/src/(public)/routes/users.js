import express from 'express';
import { doubleCsrfProtection } from '../../utils/csrf.js';
import multer from 'multer';
import path from 'path';
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile, 
  updateUserProfile, 
  uploadProfilePhoto, 
  removeProfilePhoto,
  changeEmail,
  requestEmailChange,
  verifyEmailChangeOTP,
  changePassword,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterStatus,
  verifyEmail,
  resendVerificationEmail,
  verifyToken,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  forgotPasswordUser,
  resetPasswordUser,
  checkEmailUser,
  validateResetToken,
  deleteAccount,
  refreshAccessToken,
  getUserApplications,
  getApplicationDetails,
  cancelApplication,
  deleteApplication,
  completeApplication,
} from '../controllers/userController.js';

const router = express.Router();

// Import Cloudinary upload configuration
import { cloudinaryUploadConfigs } from '../../utils/cloudinaryUpload.js';

// Use Cloudinary upload configuration for user profiles
const upload = cloudinaryUploadConfigs.userProfile;

// Public routes (no authentication required)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPasswordUser);
router.post('/reset-password', resetPasswordUser);
router.post('/validate-reset-token', validateResetToken);
router.post('/check-email', checkEmailUser);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/refresh', doubleCsrfProtection, refreshAccessToken);

// Protected routes (authentication required)
router.post('/logout', verifyToken, logoutUser);
router.get('/profile', verifyToken, getUserProfile);

router.put('/profile', verifyToken, updateUserProfile);
router.post('/profile/photo', verifyToken, upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/profile/photo', verifyToken, removeProfilePhoto);

// Email change routes (secure flow)
router.post('/email/request-change', verifyToken, requestEmailChange);
router.post('/email/verify-otp', verifyToken, verifyEmailChangeOTP);
router.put('/email', verifyToken, changeEmail); // Legacy endpoint

router.put('/password', verifyToken, changePassword);
router.post('/delete-account', verifyToken, deleteAccount);

// Newsletter routes (authentication required)
router.post('/newsletter/subscribe', verifyToken, subscribeToNewsletter);
router.post('/newsletter/unsubscribe', verifyToken, unsubscribeFromNewsletter);
router.get('/newsletter/status', verifyToken, getNewsletterStatus);

// Notification routes (authentication required)
router.get('/notifications', verifyToken, getUserNotifications);
router.get('/notifications/unread-count', verifyToken, getUnreadNotificationCount);
router.put('/notifications/:notificationId/read', verifyToken, markNotificationAsRead);
router.put('/notifications/mark-all-read', verifyToken, markAllNotificationsAsRead);
router.delete('/notifications/:notificationId', verifyToken, deleteNotification);

// User applications routes (authentication required)
router.get('/applications', verifyToken, getUserApplications);
router.get('/applications/:id', verifyToken, getApplicationDetails);
router.put('/applications/:id/cancel', verifyToken, cancelApplication);
router.put('/applications/:id/complete', verifyToken, completeApplication);
router.delete('/applications/:id', verifyToken, deleteApplication);

export default router;
