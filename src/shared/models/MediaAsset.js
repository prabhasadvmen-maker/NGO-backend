import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true // R2 object key
  },
  category: {
    type: String,
    enum: ['image', 'document', 'audio', 'video', 'other'],
    default: 'other'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

export default mongoose.model('MediaAsset', mediaAssetSchema);
