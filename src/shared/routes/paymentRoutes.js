import express from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Public routes - no auth needed for donations
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.post('/webhook', handleWebhook);

export default router;
