import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getCertificates,
  getCertificateStats,
  createCertificate,
  deleteCertificate,
  updateCertificate
} from '../controllers/certificateController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getCertificates);
router.get('/stats', verifyToken, verifyAdmin, getCertificateStats);
router.post('/', verifyToken, verifyAdmin, createCertificate);
router.delete('/:id', verifyToken, verifyAdmin, deleteCertificate);
router.put('/:id', verifyToken, verifyAdmin, updateCertificate);

export default router;
