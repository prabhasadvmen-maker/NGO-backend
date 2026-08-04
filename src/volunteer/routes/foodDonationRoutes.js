import express from 'express';
import { verifyToken } from '../../shared/middleware/auth.js';
import {
  getAvailableDonations,
  acceptAssignment,
  collectDonation,
  distributeDonation,
  getMyAssignments,
} from '../controllers/foodDonationController.js';

const router = express.Router();

// Require authenticated user/volunteer
router.use(verifyToken);

router.get('/available', getAvailableDonations);
router.get('/my-assignments', getMyAssignments);
router.post('/:id/accept', acceptAssignment);
router.put('/:id/collect', collectDonation);
router.put('/:id/distribute', distributeDonation);

export default router;
