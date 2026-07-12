import mongoose from 'mongoose';

const beneficiarySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    profilePhoto: {
      type: String, // R2 key
      default: null,
    },
    beneficiaryId: {
      type: String,
      unique: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      unique: true,
      sparse: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      sparse: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$|^$/, 'Please provide a valid email address'],
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: [null, 'Male', 'Female', 'Other'],
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    district: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    pinCode: {
      type: String,
      trim: true,
      match: [/^\d{6}$|^$/, 'PIN code must be 6 digits'],
      default: null,
    },
    category: {
      type: String,
      enum: ['Education', 'Healthcare', 'Women Empowerment', 'Skill Development', 'Disaster Relief', 'Social Welfare'],
      default: 'Healthcare',
    },
    needsIdentified: {
      type: [String],
      default: [],
    },
    supportReceived: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    // Reference to NGO branch
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch assignment is required'],
    },
    // Reference to creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate beneficiaryId before saving
beneficiarySchema.pre('save', async function (next) {
  if (!this.beneficiaryId) {
    try {
      const count = await mongoose.model('Beneficiary').countDocuments();
      this.beneficiaryId = `BEN${String(count + 1).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);
export default Beneficiary;
