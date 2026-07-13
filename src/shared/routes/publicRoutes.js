import express from 'express';
import { verifyCertificate } from '../controllers/publicController.js';

const router = express.Router();

// Public route - Rate limited by express-rate-limit configured in index.js
router.get('/verify-certificate/:certId', verifyCertificate);

export default router;
