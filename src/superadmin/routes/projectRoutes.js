import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllProjects,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectController.js';

const router = express.Router();

router.get('/', verifyToken, verifySuperAdmin, getAllProjects);
router.get('/stats', verifyToken, verifySuperAdmin, getProjectStats);
router.post('/', verifyToken, verifySuperAdmin, createProject);
router.put('/:id', verifyToken, verifySuperAdmin, updateProject);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteProject);

export default router;
