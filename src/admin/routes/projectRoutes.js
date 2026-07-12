import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllProjects,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getAllProjects);
router.get('/stats', verifyToken, verifyAdmin, getProjectStats);
router.post('/', verifyToken, verifyAdmin, createProject);
router.put('/:id', verifyToken, verifyAdmin, updateProject);
router.delete('/:id', verifyToken, verifyAdmin, deleteProject);

export default router;
