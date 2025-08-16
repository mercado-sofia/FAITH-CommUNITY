// routes/newsRoutes.js
import express from 'express';
import { 
  createNews,
  getNewsByOrg, 
  getApprovedNews, 
  getApprovedNewsByOrg,
  getNewsById,
  deleteNewsSubmission,
  updateNews
} from '../controllers/newsController.js';
import { verifyAdminToken } from '../../superadmin/controllers/adminController.js';

const router = express.Router();

// Admin routes (protected with authentication)
router.post('/admin/news/:orgId', verifyAdminToken, createNews);
router.get('/admin/news/:orgId', verifyAdminToken, getNewsByOrg);
router.put('/admin/news/:id', verifyAdminToken, updateNews);
router.delete('/admin/news/:id', verifyAdminToken, deleteNewsSubmission);

// Public routes
router.get('/news', getApprovedNews);
router.get('/news/org/:orgId', getApprovedNewsByOrg);
router.get('/news/:id', getNewsById);

export default router;
