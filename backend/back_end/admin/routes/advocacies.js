import express from 'express';
import {
    addAdvocacy,
    getAdvocacies,
    deleteAdvocacy,
    getAllAdvocacies // ✅ Add this
} from '../controllers/advocacyController.js';

const router = express.Router();

router.post('/', addAdvocacy);
router.get('/', getAllAdvocacies); // ✅ New route
router.get('/:organization_id', getAdvocacies);
router.delete('/:id', deleteAdvocacy);

export default router;
