import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAttendanceSheet,
  saveAttendance,
  getAttendanceHistory,
} from '../controllers/attendanceController.js';

const router = express.Router();

// Apply admin authentication middleware to all routes below
router.use(verifyToken, verifyAdmin);

router.get('/sheet', getAttendanceSheet);
router.post('/save', saveAttendance);
router.get('/history', getAttendanceHistory);

export default router;
