import mongoose from 'mongoose';

const locationMasterSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    minLatitude: {
      type: Number,
      required: true,
    },
    maxLatitude: {
      type: Number,
      required: true,
    },
    minLongitude: {
      type: Number,
      required: true,
    },
    maxLongitude: {
      type: Number,
      required: true,
    },
    pinCodes: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound index for faster location detection
locationMasterSchema.index({
  minLatitude: 1,
  maxLatitude: 1,
  minLongitude: 1,
  maxLongitude: 1,
  isActive: 1,
});

export default mongoose.model('LocationMaster', locationMasterSchema);
