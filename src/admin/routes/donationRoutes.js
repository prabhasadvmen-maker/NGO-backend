import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllDonations,
  getDonationStats,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
} from '../controllers/donationController.js';

const router = express.Router();

// GET all donations recorded by current admin
router.get('/', verifyToken, verifyAdmin, getAllDonations);

// GET stats summary recorded by current admin
router.get('/stats', verifyToken, verifyAdmin, getDonationStats);

// GET detailed single donation recorded by current admin
router.get('/:id', verifyToken, verifyAdmin, getDonationById);

// POST record new donation
router.post('/', verifyToken, verifyAdmin, createDonation);

// PUT update donation details
router.put('/:id', verifyToken, verifyAdmin, updateDonation);

// DELETE remove donation record
router.delete('/:id', verifyToken, verifyAdmin, deleteDonation);

export default router;
