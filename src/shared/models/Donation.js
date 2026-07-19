import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
      default: 'Anonymous',
    },
    donorEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$|^$/, 'Please provide a valid email address'],
    },
    donorPhone: {
      type: String,
      trim: true,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['online', 'bank_transfer', 'cash', 'cheque', 'other'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    donationDate: {
      type: Date,
      default: Date.now,
    },
    purpose: {
      type: String,
      trim: true,
      default: 'General',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    receiptNumber: {
      type: String,
      unique: true,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate receiptNumber before saving if not provided
donationSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    try {
      const today = new Date();
      const dateString = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      
      const count = await mongoose.model('Donation').countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      const sequence = String(count + 1).padStart(3, '0');
      const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number to guarantee daily uniqueness
      this.receiptNumber = `REC-${dateString}-${sequence}-${random}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
