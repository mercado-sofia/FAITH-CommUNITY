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

const router = express.Router();

// Admin routes
router.post('/admin/news/:orgId', createNews);
router.get('/admin/news/:orgId', getNewsByOrg);
router.put('/admin/news/:id', updateNews);
router.delete('/admin/news/:id', deleteNewsSubmission);

// Public routes
router.get('/news', getApprovedNews);
router.get('/news/org/:orgId', getApprovedNewsByOrg);
router.get('/news/:id', getNewsById);

export default router;
