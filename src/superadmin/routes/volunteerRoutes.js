import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getVolunteers,
  getVolunteerStats,
  getVolunteerById,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  toggleVolunteerStatus,
  getUploadUrl,
} from '../controllers/volunteerController.js';

const router = express.Router();

// Apply superadmin authorization middleware to all routes below
router.use(verifyToken, verifySuperAdmin);

router.get('/upload-url', getUploadUrl);
router.get('/', getVolunteers);
router.get('/stats', getVolunteerStats);
router.post('/', createVolunteer);
router.get('/:id', getVolunteerById);
router.put('/:id', updateVolunteer);
router.delete('/:id', deleteVolunteer);
router.patch('/:id/toggle-status', toggleVolunteerStatus);

export default router;
