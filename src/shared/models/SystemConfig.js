import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    webhookUrl: {
      type: String,
      default: ''
    },
    webhookEvents: {
      type: [String],
      default: []
    },
    r2AccessKey: {
      type: String,
      default: ''
    },
    r2SecretKey: {
      type: String,
      default: ''
    },
    twilioSid: {
      type: String,
      default: ''
    },
    twilioToken: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('SystemConfig', systemConfigSchema);
