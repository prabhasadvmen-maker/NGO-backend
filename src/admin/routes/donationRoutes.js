import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllDonations,
  getDonationStats,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
  getOnlineDonations,
  getOnlineDonationStats,
} from '../controllers/donationController.js';

const router = express.Router();

// Online/Razorpay donations routes (must be before /:id to avoid conflicts)
router.get('/online/all', verifyToken, verifyAdmin, getOnlineDonations);
router.get('/online/stats', verifyToken, verifyAdmin, getOnlineDonationStats);

// Admin-recorded donations routes
router.get('/', verifyToken, verifyAdmin, getAllDonations);
router.get('/stats', verifyToken, verifyAdmin, getDonationStats);
router.get('/:id', verifyToken, verifyAdmin, getDonationById);
router.post('/', verifyToken, verifyAdmin, createDonation);
router.put('/:id', verifyToken, verifyAdmin, updateDonation);
router.delete('/:id', verifyToken, verifyAdmin, deleteDonation);

export default router;
