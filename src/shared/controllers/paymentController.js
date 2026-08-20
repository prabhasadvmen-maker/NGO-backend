import crypto from 'crypto';
import Razorpay from 'razorpay';
import Donation from '../models/Donation.js';
import { sendDonationReceipt, sendAdminNotification } from '../../utils/emailService.js';

const getRazorpay = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { amount, donorName, donorEmail, donorPhone, purpose, campaign } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise mein
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { donorName, donorEmail, donorPhone, purpose },
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// Verify payment & save donation
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      donorName,
      donorEmail,
      donorPhone,
      amount,
      purpose,
      campaign,
    } = req.body;

    // Signature verify
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Check if donation already exists (idempotency)
    let donation = await Donation.findOne({ transactionId: razorpay_payment_id });
    
    if (!donation) {
      // Create new donation
      donation = new Donation({
        donorName: donorName || 'Anonymous',
        donorEmail: donorEmail || null,
        donorPhone: donorPhone || null,
        amount,
        paymentMethod: 'online',
        paymentStatus: 'completed',
        transactionId: razorpay_payment_id,
        purpose: purpose || 'General',
        campaign: campaign || null,
      });

      await donation.save();
      console.log(`✅ Donation saved: ${donation.receiptNumber}`);

      // Send emails asynchronously (don't block response)
      Promise.all([
        sendDonationReceipt({
          donorName: donation.donorName,
          donorEmail: donation.donorEmail,
          amount: donation.amount,
          receiptNumber: donation.receiptNumber,
          transactionId: donation.transactionId,
          purpose: donation.purpose,
          donationDate: donation.donationDate,
        }),
        sendAdminNotification({
          donorName: donation.donorName,
          donorEmail: donation.donorEmail,
          amount: donation.amount,
          receiptNumber: donation.receiptNumber,
          transactionId: donation.transactionId,
          purpose: donation.purpose,
        }),
      ]).catch(err => console.error('Email sending error:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Payment successful',
      receiptNumber: donation.receiptNumber,
      transactionId: razorpay_payment_id,
      donorName: donation.donorName,
      amount: donation.amount,
      donationDate: donation.donationDate,
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
};

// Razorpay webhook handler - receives raw body for signature verification
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody; // Raw body stored by middleware

    if (!signature || !rawBody) {
      console.warn('⚠️ Webhook missing signature or raw body');
      return res.status(400).json({ success: false, message: 'Invalid webhook request' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    console.log('✅ Razorpay webhook received and signature verified');

    const { event, payload } = req.body;
    console.log(`📊 Processing webhook event: ${event}`);

    // Handle different payment events
    if (event === 'payment.authorized' || event === 'payment.captured' || event === 'order.paid') {
      const paymentId = payload.payment?.entity?.id;
      const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;
      const amount = payload.payment?.entity?.amount || payload.order?.entity?.amount;

      if (paymentId) {
        // Check if donation already exists (idempotency for webhook retries)
        let donation = await Donation.findOne({ transactionId: paymentId });
        
        if (!donation) {
          // Create new donation from webhook
          donation = new Donation({
            donorName: 'Webhook Payment',
            donorEmail: null,
            donorPhone: null,
            amount: Math.round(amount / 100), // Convert from paise to rupees
            paymentMethod: 'online',
            paymentStatus: 'completed',
            transactionId: paymentId,
            razorpayOrderId: orderId,
            purpose: 'General',
            campaign: null,
          });
          await donation.save();
          console.log(`✅ Donation created from webhook: ${paymentId}`);
        } else {
          // Update existing donation status
          donation.paymentStatus = 'completed';
          await donation.save();
          console.log(`✅ Donation status updated: ${paymentId}`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentId = payload.payment?.entity?.id;
      
      if (paymentId) {
        // Check if donation exists
        let donation = await Donation.findOne({ transactionId: paymentId });
        
        if (donation) {
          donation.paymentStatus = 'failed';
          await donation.save();
          console.log(`⚠️ Donation marked as failed: ${paymentId}`);
        }
      }
    }

    console.log(`✅ Payment event processed: ${event}`);
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    // Always return 200 to acknowledge receipt, even on error
    res.status(200).json({ success: false, message: 'Webhook processing error' });
  }
};
