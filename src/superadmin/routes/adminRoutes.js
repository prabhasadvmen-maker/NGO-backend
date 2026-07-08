import express from 'express';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, toggleAdminStatus, loginAsAdmin } from '../controllers/adminController.js';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(verifyToken, verifySuperAdmin);

router.get('/', getAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.patch('/:id/toggle-status', toggleAdminStatus);
router.post('/:id/login-as', loginAsAdmin);

export default router;
