import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  sendBranchBulkCommunication,
  getBranchCommunicationLogs,
  deleteBranchCommunicationLog
} from '../controllers/communicationController.js';

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.post('/send', sendBranchBulkCommunication);
router.get('/logs', getBranchCommunicationLogs);
router.delete('/logs/:id', deleteBranchCommunicationLog);

export default router;
