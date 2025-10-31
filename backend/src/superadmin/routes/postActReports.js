import express from 'express';
import { verifyAdminOrSuperadmin } from '../middleware/verifyAdminOrSuperadmin.js';
import { listPendingPostActReports, approvePostActReport, rejectPostActReport } from '../controllers/postActReportController.js';

const router = express.Router();

router.use(verifyAdminOrSuperadmin);

router.get('/superadmin/post-act-reports/pending', listPendingPostActReports);
router.put('/superadmin/post-act-reports/:reportId/approve', approvePostActReport);
router.put('/superadmin/post-act-reports/:reportId/reject', rejectPostActReport);

export default router;



