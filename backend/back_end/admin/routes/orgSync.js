import express from 'express';
import { syncOrganizationsFromAdmins } from '../controllers/orgSyncController.js';


const router = express.Router();

router.post('/sync-orgs', syncOrganizationsFromAdmins);

export default router;
