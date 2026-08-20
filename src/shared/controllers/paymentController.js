import crypto from 'crypto';
import Razorpay from 'razorpay';
import Donation from '../models/Donation.js';

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

    // Donation save karo
    const donation = new Donation({
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

    res.status(200).json({
      success: true,
      message: 'Payment successful',
      receiptNumber: donation.receiptNumber,
      transactionId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
};

// Razorpay webhook handler
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.failed') {
      const paymentId = payload.payment.entity.id;
      await Donation.findOneAndUpdate(
        { transactionId: paymentId },
        { paymentStatus: 'failed' }
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false });
  }
};
