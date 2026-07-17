import express from 'express';
import { 
  verifyCertificate
} from '../controllers/publicController.js';

const router = express.Router();

// Document / Certificate verification
router.get('/verify-certificate/:certId', verifyCertificate);

export default router;
