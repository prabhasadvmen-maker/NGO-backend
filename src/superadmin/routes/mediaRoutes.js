import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getMediaUploadUrl,
  createMediaAsset,
  getAllMediaAssets,
  deleteMediaAsset
} from '../controllers/mediaController.js';

const router = express.Router();

router.use(verifyToken, verifySuperAdmin);

router.get('/upload-url', getMediaUploadUrl);
router.post('/', createMediaAsset);
router.get('/', getAllMediaAssets);
router.delete('/:id', deleteMediaAsset);

export default router;
