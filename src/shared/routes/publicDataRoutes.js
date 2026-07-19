import express from 'express';
import {
  getPublicProjects,
  getPublicEvents,
  getPublicCampaigns,
  getPublicStats,
  createPublicDonation
} from '../controllers/publicDataController.js';
import Branch from '../models/Branch.js';

const router = express.Router();
router.get('/projects', getPublicProjects);
router.get('/events', getPublicEvents);
router.get('/campaigns', getPublicCampaigns);
router.get('/stats', getPublicStats);
router.post('/donate', createPublicDonation);
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }, 'name city state').sort({ name: 1 });
    res.json({ success: true, data: branches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch branches' });
  }
});
export default router;
