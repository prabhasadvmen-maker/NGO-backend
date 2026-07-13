import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllCampaigns,
  getCampaignStats,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addCampaignContribution,
  getCampaignContributions
} from '../controllers/campaignController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getAllCampaigns);
router.get('/stats', verifyToken, verifyAdmin, getCampaignStats);
router.post('/', verifyToken, verifyAdmin, createCampaign);
router.put('/:id', verifyToken, verifyAdmin, updateCampaign);
router.delete('/:id', verifyToken, verifyAdmin, deleteCampaign);

router.post('/:id/contributions', verifyToken, verifyAdmin, addCampaignContribution);
router.get('/:id/contributions', verifyToken, verifyAdmin, getCampaignContributions);

export default router;
