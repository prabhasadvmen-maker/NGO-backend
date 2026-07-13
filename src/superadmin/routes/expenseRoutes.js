import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/', verifyToken, verifySuperAdmin, getAllExpenses);
router.get('/stats', verifyToken, verifySuperAdmin, getExpenseStats);
router.get('/:id', verifyToken, verifySuperAdmin, getExpenseById);
router.post('/', verifyToken, verifySuperAdmin, createExpense);
router.put('/:id', verifyToken, verifySuperAdmin, updateExpense);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteExpense);

export default router;
