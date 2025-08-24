//controller: programProjectsController.js

import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  addProgramProject,
  updateProgramProject,
  getProgramProjects,
  getAllProgramsForSuperadmin,
  getProgramsStatistics,
} from '../controllers/programProjectsController.js';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Make sure your app.js creates this folder at startup (you already do)
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}_${sanitized}`);
  },
});
const upload = multer({ storage });

// ===================== Admin routes =====================
router.post('/', upload.single('image'), addProgramProject);
router.put('/:id', upload.single('image'), updateProgramProject);
router.get('/', getProgramProjects);

// ================= Superadmin routes =====================
router.get('/superadmin/all', getAllProgramsForSuperadmin);
router.get('/superadmin/statistics', getProgramsStatistics);

export default router;