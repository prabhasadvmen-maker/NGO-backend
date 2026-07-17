import express from 'express';
import {
  getPublicProjects,
  getPublicEvents,
  getPublicCampaigns,
  getPublicStats
} from '../controllers/publicDataController.js';

const router = express.Router();
router.get('/projects', getPublicProjects);
router.get('/events', getPublicEvents);
router.get('/campaigns', getPublicCampaigns);
router.get('/stats', getPublicStats);
export default router;
