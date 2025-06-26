import express from 'express';
import {
  createSubscription,
  getAllSubscriptions
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/', createSubscription);    // subscribe
router.get('/', getAllSubscriptions);    // get all subscriptions

export default router;
