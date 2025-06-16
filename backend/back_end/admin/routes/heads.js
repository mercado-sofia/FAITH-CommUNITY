import express from 'express';
import {
  addHead,
  getHeads,
  deleteHead
} from '../controllers/headController.js';

const router = express.Router();

router.post('/', addHead);
router.get('/:organization_id', getHeads);
router.delete('/:id', deleteHead);

export default router;