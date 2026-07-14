import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getVolunteers,
  getVolunteerStats,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  approveVolunteerRequest,
  rejectVolunteerRequest,
  getUploadUrl,
} from '../controllers/volunteerController.js';

const router = express.Router();

// Apply admin authentication middleware to all routes below
router.use(verifyToken, verifyAdmin);

router.get('/upload-url', getUploadUrl);
router.get('/', getVolunteers);
router.get('/stats', getVolunteerStats);
router.post('/', createVolunteer);
router.post('/:id/approve-request', approveVolunteerRequest);
router.post('/:id/reject-request', rejectVolunteerRequest);
router.get('/:id', getVolunteerById);
router.put('/:id', updateVolunteer);
router.delete('/:id', deleteVolunteer);

export default router;
