import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/stats', getDashboardStats);

export default router;
