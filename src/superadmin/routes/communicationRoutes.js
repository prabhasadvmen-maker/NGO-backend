import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  sendBulkCommunication,
  getCommunicationLogs,
  deleteCommunicationLog,
  getMockCommunicationInbox
} from '../controllers/communicationController.js';

const router = express.Router();

router.use(verifyToken, verifySuperAdmin);

router.post('/send', sendBulkCommunication);
router.get('/logs', getCommunicationLogs);
router.delete('/logs/:id', deleteCommunicationLog);
router.get('/mock-inbox', getMockCommunicationInbox);

export default router;
