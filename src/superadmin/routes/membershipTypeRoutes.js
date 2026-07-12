import express from 'express';
import { verifyToken, verifySuperAdmin, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getMembershipTypes,
  getMembershipTypeById,
  createMembershipType,
  updateMembershipType,
  deleteMembershipType,
} from '../controllers/membershipTypeController.js';

const router = express.Router();

// Public read endpoints - accessible to both Super Admin and Admin
router.get('/', verifyToken, getMembershipTypes);
router.get('/:id', verifyToken, getMembershipTypeById);

// Protected write endpoints - only Super Admin
router.post('/', verifyToken, verifySuperAdmin, createMembershipType);
router.put('/:id', verifyToken, verifySuperAdmin, updateMembershipType);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteMembershipType);

export default router;
