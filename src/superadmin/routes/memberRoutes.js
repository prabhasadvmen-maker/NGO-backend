import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getMembers,
  getMemberStats,
  getMemberById,
  updateMember,
  deleteMember,
  toggleMemberStatus,
  loginAsMember,
} from '../controllers/memberController.js';

const router = express.Router();

// Apply superadmin authorization middleware to all routes below
router.use(verifyToken, verifySuperAdmin);

router.get('/', getMembers);
router.get('/stats', getMemberStats);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);
router.patch('/:id/toggle-status', toggleMemberStatus);
router.post('/:id/login-as', loginAsMember);

export default router;
