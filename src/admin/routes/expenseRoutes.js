import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  updateExpenseStatus
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getAllExpenses);
router.get('/stats', verifyToken, verifyAdmin, getExpenseStats);
router.get('/:id', verifyToken, verifyAdmin, getExpenseById);
router.post('/', verifyToken, verifyAdmin, createExpense);
router.put('/:id', verifyToken, verifyAdmin, updateExpense);
router.delete('/:id', verifyToken, verifyAdmin, deleteExpense);
router.patch('/:id/status', verifyToken, verifyAdmin, updateExpenseStatus);

export default router;
