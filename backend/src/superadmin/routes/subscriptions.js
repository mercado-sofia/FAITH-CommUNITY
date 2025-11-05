import express from 'express';
import {
  createSubscription,
  getAllSubscriptions
} from '../controllers/subscriptionController.js';
import { verifySuperadminToken } from '../controllers/superadminAuthController.js';

const router = express.Router();

// SECURITY FIX: All subscription routes require superadmin authentication
router.use(verifySuperadminToken);

router.post('/', createSubscription);    // subscribe
router.get('/', getAllSubscriptions);    // get all subscriptions

export default router;
