import express from 'express';
import {
  createSubscription,
  confirmSubscription,
  unsubscribe,
  getAllSubscriptions,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/subscribe', createSubscription);
router.get('/confirm', confirmSubscription);
router.get('/confirm/:token', confirmSubscription);
router.get('/unsubscribe/:token', unsubscribe);
router.get('/admin/subscriptions', getAllSubscriptions);

export default router;
