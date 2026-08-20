import express from 'express';
import { createOrder, verifyPayment, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Middleware to capture raw body for webhook signature verification
const rawBodyMiddleware = (req, res, next) => {
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.rawBody = rawBody;
    next();
  });
};

// Public routes - no auth needed for donations
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

// Webhook route with raw body middleware for signature verification
router.post('/razorpay/webhook', rawBodyMiddleware, handleWebhook);

export default router;
