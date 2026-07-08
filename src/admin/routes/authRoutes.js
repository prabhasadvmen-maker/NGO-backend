import express from 'express';
import { getMe } from '../controllers/authController.js';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';

const router = express.Router();

router.get('/me', verifyToken, verifyAdmin, getMe);

export default router;
