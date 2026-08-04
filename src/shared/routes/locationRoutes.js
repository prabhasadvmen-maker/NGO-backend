import express from 'express';
import {
  detectLocationFromCoordinates,
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationById,
} from '../controllers/locationController.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route - detect location from GPS coordinates
router.get('/detect', detectLocationFromCoordinates);

// Admin/Superadmin routes - manage locations
router.get('/', verifyToken, verifyAdmin, getAllLocations);
router.post('/', verifyToken, verifyAdmin, createLocation);
router.get('/:id', verifyToken, verifyAdmin, getLocationById);
router.put('/:id', verifyToken, verifyAdmin, updateLocation);
router.delete('/:id', verifyToken, verifyAdmin, deleteLocation);

export default router;
