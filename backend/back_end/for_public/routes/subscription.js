import express from 'express';
import {
  createSubscription,
  confirmSubscription,
  unsubscribe,
  getAllSubscriptions,
  debugSubscribers,
  fixSubscriptions,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/subscribe', createSubscription);
router.get('/confirm', confirmSubscription);
router.get('/confirm/:token', confirmSubscription);
router.get('/unsubscribe/:token', unsubscribe);
router.get('/admin/subscriptions', getAllSubscriptions);
router.get('/debug/subscribers', debugSubscribers);
router.get('/fix/subscriptions', fixSubscriptions);

export default router;
