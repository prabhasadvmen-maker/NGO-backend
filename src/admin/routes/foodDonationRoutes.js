import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllDonations,
  getPendingDonations,
  getDonationById,
  verifyDonation,
  assignVolunteer,
  getAvailableVolunteers,
  deleteDonation,
} from '../controllers/foodDonationController.js';

const router = express.Router();

// Apply admin verification middleware
router.use(verifyToken, verifyAdmin);

router.get('/', getAllDonations);
router.get('/pending', getPendingDonations);
router.get('/volunteers/available', getAvailableVolunteers);
router.get('/:id', getDonationById);
router.put('/:id/verify', verifyDonation);
router.put('/:id/assign-volunteer', assignVolunteer);
router.delete('/:id', deleteDonation);

export default router;
