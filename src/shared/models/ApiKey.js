import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    keyPrefix: {
      type: String,
      required: true
    },
    hashedKey: {
      type: String,
      required: true
    },
    scopes: {
      type: [String],
      default: ['read']
    },
    status: {
      type: String,
      enum: ['Active', 'Revoked'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('ApiKey', apiKeySchema);
