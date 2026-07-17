import mongoose from 'mongoose';
import crypto from 'crypto';

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      unique: true,
    },
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    role: {
      type: String,
      enum: ['Member', 'Volunteer', 'Donor', 'Other'],
      default: 'Member',
    },
    type: {
      type: String,
      enum: ['Membership', 'Volunteering', 'Donation', 'Appreciation', 'Custom'],
      default: 'Appreciation',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Certificate body/description is required'],
      trim: true,
    },
    signatoryName: {
      type: String,
      default: 'Savitram Foundation Board',
      trim: true,
    },
    signatoryTitle: {
      type: String,
      default: 'Authorized Signatory',
      trim: true,
    },
    hash: {
      type: String,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate certificateId and cryptography validation hash
certificateSchema.pre('save', async function (next) {
  if (!this.certificateId) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('Certificate').countDocuments();
      const sequence = String(count + 1).padStart(5, '0');
      this.certificateId = `CERT-${year}-${sequence}`;
    } catch (err) {
      return next(err);
    }
  }

  if (!this.hash) {
    // Generate secure validation hash
    const secretInput = `${this.certificateId}-${this.recipientEmail}-${Date.now()}`;
    this.hash = crypto.createHash('sha256').update(secretInput).digest('hex');
  }

  next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
