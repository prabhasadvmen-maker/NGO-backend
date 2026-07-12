import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getBeneficiaries,
  getBeneficiaryStats,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  toggleBeneficiaryStatus,
  getUploadUrl,
} from '../controllers/beneficiaryController.js';

const router = express.Router();

// Apply superadmin authorization middleware to all routes below
router.use(verifyToken, verifySuperAdmin);

router.get('/upload-url', getUploadUrl);
router.get('/', getBeneficiaries);
router.get('/stats', getBeneficiaryStats);
router.post('/', createBeneficiary);
router.get('/:id', getBeneficiaryById);
router.put('/:id', updateBeneficiary);
router.delete('/:id', deleteBeneficiary);
router.patch('/:id/toggle-status', toggleBeneficiaryStatus);

export default router;
