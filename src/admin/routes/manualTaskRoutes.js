import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllManualTasks,
  getUnassignedManualTasks,
  createManualTask,
  assignManualTask,
  unassignManualTask,
  updateManualTask,
  updateManualTaskStatus,
  getVolunteerManualTasks,
  deleteManualTask,
} from '../controllers/manualTaskController.js';

const router = express.Router();

// Admin routes
router.get('/manual-tasks', verifyToken, verifyAdmin, getAllManualTasks);
router.get('/manual-tasks/unassigned', verifyToken, verifyAdmin, getUnassignedManualTasks);
router.post('/manual-tasks', verifyToken, verifyAdmin, createManualTask);
router.put('/manual-tasks/:taskId', verifyToken, verifyAdmin, updateManualTask);
router.post('/manual-tasks/assign', verifyToken, verifyAdmin, assignManualTask);
router.post('/manual-tasks/unassign', verifyToken, verifyAdmin, unassignManualTask);
router.delete('/manual-tasks/:taskId', verifyToken, verifyAdmin, deleteManualTask);

// Status update - allowed for both admin and volunteers
router.put('/manual-tasks/:taskId/status', verifyToken, updateManualTaskStatus);

// Volunteer routes
router.get('/volunteer/manual-tasks', verifyToken, getVolunteerManualTasks);

export default router;
