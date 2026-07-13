import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getBranchMediaUploadUrl,
  createBranchMediaAsset,
  getAllBranchMediaAssets,
  deleteBranchMediaAsset
} from '../controllers/mediaController.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/upload-url', getBranchMediaUploadUrl);
router.post('/', createBranchMediaAsset);
router.get('/', getAllBranchMediaAssets);
router.delete('/:id', deleteBranchMediaAsset);

export default router;
