import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getNgoProfile,
  updateNgoProfile,
  getNgoProfileUploadUrl,
} from '../controllers/ngoProfileController.js';

const router = express.Router();

// Read endpoint - accessible to public
router.get('/', getNgoProfile);

// Write endpoints - Super Admin only
router.put('/', verifyToken, verifySuperAdmin, updateNgoProfile);
router.get('/upload-url', verifyToken, verifySuperAdmin, getNgoProfileUploadUrl);

export default router;
