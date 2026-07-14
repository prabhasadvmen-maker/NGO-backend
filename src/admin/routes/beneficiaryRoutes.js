import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getBeneficiaries,
  getBeneficiaryStats,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  approveBeneficiaryRequest,
  rejectBeneficiaryRequest,
  getUploadUrl,
} from '../controllers/beneficiaryController.js';

const router = express.Router();

// Apply admin authentication middleware to all routes below
router.use(verifyToken, verifyAdmin);

router.get('/upload-url', getUploadUrl);
router.get('/', getBeneficiaries);
router.get('/stats', getBeneficiaryStats);
router.post('/', createBeneficiary);
router.post('/:id/approve-request', approveBeneficiaryRequest);
router.post('/:id/reject-request', rejectBeneficiaryRequest);
router.get('/:id', getBeneficiaryById);
router.put('/:id', updateBeneficiary);
router.delete('/:id', deleteBeneficiary);

export default router;
