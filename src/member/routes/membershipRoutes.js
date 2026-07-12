import express from 'express';
import { verifyToken, verifyMember } from '../../shared/middleware/auth.js';
import {
  getMemberMembership,
  requestMembershipUpgrade,
  getMembershipRequests,
} from '../controllers/membershipController.js';

const router = express.Router();

// Protected routes (requires valid member token)
router.get('/', verifyToken, verifyMember, getMemberMembership);
router.post('/request-upgrade', verifyToken, verifyMember, requestMembershipUpgrade);
router.get('/requests', verifyToken, verifyMember, getMembershipRequests);

export default router;
