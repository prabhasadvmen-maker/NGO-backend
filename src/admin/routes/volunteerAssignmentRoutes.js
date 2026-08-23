import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import { getAllVolunteerAssignments } from '../controllers/volunteerAssignmentController.js';

const router = express.Router();

// GET all volunteer assignments
router.get('/volunteer-assignments', verifyToken, verifyAdmin, getAllVolunteerAssignments);

export default router;
