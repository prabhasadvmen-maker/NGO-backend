import express from 'express';
import { getMe, login } from '../controllers/authController.js';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', verifyToken, verifyAdmin, getMe);

export default router;
