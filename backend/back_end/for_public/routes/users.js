import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile, 
  updateUserProfile, 
  uploadProfilePhoto, 
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
  forgotPasswordUser,
  resetPasswordUser,
  checkEmailUser,
  validateResetToken,
} from '../controllers/userController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/processing/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes (no authentication required)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPasswordUser);
router.post('/reset-password', resetPasswordUser);
router.post('/validate-reset-token', validateResetToken);
router.post('/check-email', checkEmailUser);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes (authentication required)
router.post('/logout', verifyToken, logoutUser);
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateUserProfile);
router.post('/profile/photo', verifyToken, upload.single('profilePhoto'), uploadProfilePhoto);
router.put('/password', verifyToken, changePassword);

// Newsletter routes (authentication required)
router.post('/newsletter/subscribe', verifyToken, subscribeToNewsletter);
router.post('/newsletter/unsubscribe', verifyToken, unsubscribeFromNewsletter);
router.get('/newsletter/status', verifyToken, getNewsletterStatus);

// Notification routes (authentication required)
router.get('/notifications', verifyToken, getUserNotifications);
router.get('/notifications/unread-count', verifyToken, getUnreadNotificationCount);
router.put('/notifications/:notificationId/read', verifyToken, markNotificationAsRead);
router.put('/notifications/mark-all-read', verifyToken, markAllNotificationsAsRead);

export default router;
