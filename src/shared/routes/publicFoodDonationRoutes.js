import express from 'express';
import {
  createFoodDonation,
  getFoodDonationStatus,
  getPublicImpactStats,
  getPhotoUploadUrl,
} from '../controllers/publicFoodDonationController.js';

const router = express.Router();

router.get('/upload-url', getPhotoUploadUrl);
router.post('/', createFoodDonation);
router.get('/stats', getPublicImpactStats);
router.get('/:identifier', getFoodDonationStatus);

export default router;
