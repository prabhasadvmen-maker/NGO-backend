import express from 'express';
import { verifyToken, verifySuperAdmin, verifyAdmin } from '../middleware/auth.js';
import { getSuperAdminReports, getAdminReports } from '../controllers/reportsController.js';

const router = express.Router();

router.get('/superadmin', verifyToken, verifySuperAdmin, getSuperAdminReports);
router.get('/admin', verifyToken, verifyAdmin, getAdminReports);

export default router;
