import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getFoodDonationAnalytics,
  getFoodDonationReport,
} from '../controllers/foodDonationController.js';

const router = express.Router();

router.use(verifyToken, verifySuperAdmin);

router.get('/analytics', getFoodDonationAnalytics);
router.get('/reports', getFoodDonationReport);

export default router;
