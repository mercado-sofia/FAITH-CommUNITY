import express from 'express';
import { 
  createSubscription, 
  confirmSubscription, 
  unsubscribe, 
  getAllSubscriptions,
  debugSubscribers,
  fixSubscriptions
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Public newsletter routes
router.post('/subscribe', createSubscription);
router.get('/confirm/:token', confirmSubscription);
router.get('/unsubscribe/:token', unsubscribe);

// Admin route (protected)
router.get('/admin/subscriptions', getAllSubscriptions);

// Debug route
router.get('/debug/subscribers', debugSubscribers);

// Fix route
router.get('/fix/subscriptions', fixSubscriptions);

export default router;
