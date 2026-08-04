import express from 'express';
import multer from 'multer';
import { volunteerSignup, volunteerLogin, getVolunteerProfile } from '../controllers/authController.js';
import { verifyToken } from '../../shared/middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Public routes
router.post('/signup', upload.single('profilePhoto'), volunteerSignup);
router.post('/login', volunteerLogin);

// Protected routes
router.get('/me', verifyToken, getVolunteerProfile);

export default router;
