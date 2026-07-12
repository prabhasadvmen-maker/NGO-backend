import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
} from '../controllers/branchController.js';

const router = express.Router();

// Read all branches - Admin and Super Admin
router.get('/', verifyToken, getAllBranches);

// Stats - Super Admin only
router.get('/stats', verifyToken, verifySuperAdmin, getBranchStats);

// Read single branch - Admin and Super Admin
router.get('/:id', verifyToken, getBranchById);

// Create branch - Super Admin only
router.post('/', verifyToken, verifySuperAdmin, createBranch);

// Update branch - Super Admin only
router.put('/:id', verifyToken, verifySuperAdmin, updateBranch);

// Delete branch - Super Admin only
router.delete('/:id', verifyToken, verifySuperAdmin, deleteBranch);

export default router;
