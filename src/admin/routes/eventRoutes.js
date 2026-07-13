import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllEvents,
  getEventStats,
  createEvent,
  updateEvent,
  deleteEvent,
  registerAttendee,
  getEventRegistrations,
  toggleAttendance
} from '../controllers/eventController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getAllEvents);
router.get('/stats', verifyToken, verifyAdmin, getEventStats);
router.post('/', verifyToken, verifyAdmin, createEvent);
router.put('/:id', verifyToken, verifyAdmin, updateEvent);
router.delete('/:id', verifyToken, verifyAdmin, deleteEvent);

router.post('/:id/register', verifyToken, verifyAdmin, registerAttendee);
router.get('/:id/registrations', verifyToken, verifyAdmin, getEventRegistrations);
router.patch('/:eventId/registrations/:regId', verifyToken, verifyAdmin, toggleAttendance);

export default router;
