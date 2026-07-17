import express from 'express';
import { verifyToken, verifyMember } from '../../shared/middleware/auth.js';
import {
  memberRegister,
  memberLogin,
  memberGetMe,
  getMemberUploadUrl,
  memberUpdateProfile
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', memberRegister);
router.post('/login', memberLogin);
router.get('/upload-url', getMemberUploadUrl);

// Protected routes (requires valid member token)
router.get('/me', verifyToken, verifyMember, memberGetMe);
router.put('/me', verifyToken, verifyMember, memberUpdateProfile);

export default router;
