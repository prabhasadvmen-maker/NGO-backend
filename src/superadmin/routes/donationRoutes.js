import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllDonations,
  getDonationStats,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
} from '../controllers/donationController.js';

const router = express.Router();

// GET all donations with pagination and filters
router.get('/', verifyToken, verifySuperAdmin, getAllDonations);

// GET stats summary and monthly trends
router.get('/stats', verifyToken, verifySuperAdmin, getDonationStats);

// GET detailed single donation
router.get('/:id', verifyToken, verifySuperAdmin, getDonationById);

// POST record new donation
router.post('/', verifyToken, verifySuperAdmin, createDonation);

// PUT update donation details
router.put('/:id', verifyToken, verifySuperAdmin, updateDonation);

// DELETE remove donation record
router.delete('/:id', verifyToken, verifySuperAdmin, deleteDonation);

export default router;
