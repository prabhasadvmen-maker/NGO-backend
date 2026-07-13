import mongoose from 'mongoose';

const communicationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Email', 'SMS', 'WhatsApp', 'In-App'],
    required: true
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  recipientType: {
    type: String,
    enum: ['Volunteers', 'Members', 'Beneficiaries', 'Donors', 'All'],
    required: true
  },
  recipientsCount: {
    type: Number,
    default: 0
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed'],
    default: 'Sent'
  }
}, { timestamps: true });

export default mongoose.model('CommunicationLog', communicationLogSchema);
