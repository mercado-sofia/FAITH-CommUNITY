import express from 'express';
import {
  createFooterInfo,
  updateFooterInfo,
  getFooterInfo,
  getAllFooterEntries
} from '../controllers/footerController.js';

const router = express.Router();

router.post('/', createFooterInfo);
router.put('/:id', updateFooterInfo);
router.get('/', getFooterInfo);              // GET ACTIVE only
router.get('/all', getAllFooterEntries);     // GET ALL records

export default router;
