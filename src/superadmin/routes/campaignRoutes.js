import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllCampaigns,
  getCampaignStats,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignContributions
} from '../controllers/campaignController.js';

const router = express.Router();

router.get('/', verifyToken, verifySuperAdmin, getAllCampaigns);
router.get('/stats', verifyToken, verifySuperAdmin, getCampaignStats);
router.post('/', verifyToken, verifySuperAdmin, createCampaign);
router.put('/:id', verifyToken, verifySuperAdmin, updateCampaign);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteCampaign);

router.get('/:id/contributions', verifyToken, verifySuperAdmin, getCampaignContributions);

export default router;
