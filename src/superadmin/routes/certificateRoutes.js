import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getCertificates,
  getCertificateStats,
  createCertificate,
  deleteCertificate
} from '../controllers/certificateController.js';

const router = express.Router();

router.get('/', verifyToken, verifySuperAdmin, getCertificates);
router.get('/stats', verifyToken, verifySuperAdmin, getCertificateStats);
router.post('/', verifyToken, verifySuperAdmin, createCertificate);
router.delete('/:id', verifyToken, verifySuperAdmin, deleteCertificate);

export default router;
