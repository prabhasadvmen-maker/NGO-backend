import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getCertificates,
  getCertificateStats,
  createCertificate
} from '../controllers/certificateController.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getCertificates);
router.get('/stats', verifyToken, verifyAdmin, getCertificateStats);
router.post('/', verifyToken, verifyAdmin, createCertificate);

export default router;
