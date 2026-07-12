import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const memberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    profilePhoto: {
      type: String, // R2 object key (not full URL)
      default: null,
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
    password: {
      type: String,
      default: null,
      select: false,
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
    state: {
      type: String,
      trim: true,
      default: null,
    },
    district: {
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
    occupation: {
      type: String,
      trim: true,
      default: null,
    },
    membershipType: {
      type: String,
      default: 'General',
    },
    membershipFee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    referredBy: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Inactive'],
      default: 'Pending',
    },
    requestedMembershipType: {
      type: String,
      default: null,
    },
    requestStatus: {
      type: String,
      enum: [null, 'Pending', 'Approved', 'Rejected'],
      default: null,
    },
    // Associated NGO branch
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    // Which admin org this member belongs to
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Auto-generate memberId & hash password before save
memberSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (!this.memberId) {
    const count = await mongoose.model('Member').countDocuments();
    this.memberId = `MEM${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Member = mongoose.model('Member', memberSchema);
export default Member;
