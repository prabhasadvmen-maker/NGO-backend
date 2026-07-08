import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getUploadUrl,
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  loginAsMember,
  approveMembershipRequest,
  rejectMembershipRequest,
} from '../controllers/memberController.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/upload-url', getUploadUrl);
router.get('/', getMembers);
router.post('/', createMember);
router.post('/:id/login-as', loginAsMember);
router.post('/:id/approve-request', approveMembershipRequest);
router.post('/:id/reject-request', rejectMembershipRequest);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
