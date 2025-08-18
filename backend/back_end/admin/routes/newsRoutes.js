// routes/newsRoutes.js
import express from 'express';
import { 
  createNews,
  getNewsByOrg, 
  getApprovedNews, 
  getApprovedNewsByOrg,
  getNewsById,
  deleteNewsSubmission,
  updateNews,
  getRecentlyDeletedNews,
  restoreNews,
  permanentlyDeleteNews
} from '../controllers/newsController.js';
import { manualCleanupDeletedNews } from '../../utils/cleanupDeletedNews.js';
import { verifyAdminToken } from '../../superadmin/controllers/adminController.js';

const router = express.Router();

// Admin routes (protected with authentication)
router.post('/admin/news/:orgId', verifyAdminToken, createNews);
router.get('/admin/news/:orgId', verifyAdminToken, getNewsByOrg);
router.put('/admin/news/:id', verifyAdminToken, updateNews);
router.delete('/admin/news/:id', verifyAdminToken, deleteNewsSubmission);

// Recently deleted news routes
router.get('/admin/news/:orgId/deleted', verifyAdminToken, getRecentlyDeletedNews);
router.post('/admin/news/:id/restore', verifyAdminToken, restoreNews);
router.delete('/admin/news/:id/permanent', verifyAdminToken, permanentlyDeleteNews);

// Cleanup route (for manual cleanup of old deleted items)
router.post('/admin/news/cleanup', verifyAdminToken, manualCleanupDeletedNews);

// Public routes (no authentication required)
router.get('/news', getApprovedNews);
router.get('/news/:orgId', getApprovedNewsByOrg);
router.get('/news/detail/:id', getNewsById);

export default router;
