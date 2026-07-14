import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllProjects,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject,
  getProjectExpenses,
  addProjectExpense,
  deleteProjectExpense,
  updateProjectExpense,
} from '../controllers/projectController.js';

const router = express.Router();

// Apply admin authentication middleware to all routes below
router.use(verifyToken, verifyAdmin);

router.get('/', getAllProjects);
router.get('/stats', getProjectStats);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Project-specific expenses
router.get('/:id/expenses', getProjectExpenses);
router.post('/:id/expenses', addProjectExpense);
router.put('/:projectId/expenses/:expenseId', updateProjectExpense);
router.delete('/:projectId/expenses/:expenseId', deleteProjectExpense);

export default router;
