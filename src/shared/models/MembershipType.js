import mongoose from 'mongoose';

const membershipTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Membership type name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    annualFee: {
      type: Number,
      required: [true, 'Annual fee is required'],
      min: [0, 'Annual fee cannot be negative'],
      default: 0,
    },
    lifetimeFee: {
      type: Number,
      required: [true, 'Lifetime fee is required'],
      min: [0, 'Lifetime fee cannot be negative'],
      default: 0,
    },
    benefits: {
      type: [String],
      default: [],
    },
    maxUpgrades: {
      type: Number,
      min: [0, 'Max upgrades cannot be negative'],
      default: 0,
    },
    validityYears: {
      type: Number,
      min: [1, 'Validity must be at least 1 year'],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const MembershipType = mongoose.model('MembershipType', membershipTypeSchema);
export default MembershipType;
