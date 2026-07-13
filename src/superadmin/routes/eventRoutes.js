import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getAllEvents,
  getEventStats,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  updateRegistrationStatus
} from '../controllers/eventController.js';

const router = express.Router();

router.get('/', verifyToken, verifySuperAdmin, getAllEvents);
router.get('/stats', verifyToken, verifySuperAdmin, getEventStats);
router.post('/', verifyToken, verifySuperAdmin, createEvent);
router.put('/:id', verifyToken, verifySuperAdmin, updateEvent);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteEvent);

router.get('/:id/registrations', verifyToken, verifySuperAdmin, getEventRegistrations);
router.patch('/:eventId/registrations/:regId', verifyToken, verifySuperAdmin, updateRegistrationStatus);

export default router;
