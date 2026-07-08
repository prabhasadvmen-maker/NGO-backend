import express from 'express';
import { login, getMe, getDashboardStats, getRecentRegistrations } from '../controllers/authController.js';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import { validateLogin, handleValidationErrors } from '../../shared/middleware/validation.js';

const router = express.Router();

router.post('/login', validateLogin, handleValidationErrors, login);
router.get('/me', verifyToken, getMe);
router.get('/dashboard/stats', verifyToken, verifySuperAdmin, getDashboardStats);
router.get('/dashboard/recent-registrations', verifyToken, verifySuperAdmin, getRecentRegistrations);

export default router;
