import mongoose from 'mongoose';

const cmsConfigSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
      default: 'SAVITRAM FOUNDATION',
      trim: true,
    },
    heroSubtitle: {
      type: String,
      default: 'Empowering communities, creating opportunities, and building a brighter future.',
      trim: true,
    },
    heroImage: {
      type: String,
      default: '',
    },
    newsCoverImage: {
      type: String,
      default: '',
    },
    galleryImage: {
      type: String,
      default: '',
    },
    testimonialAvatar: {
      type: String,
      default: '',
    },
    mission: {
      type: String,
      default: 'To inspire and support community growth through sustainable programs.',
      trim: true,
    },
    vision: {
      type: String,
      default: 'A world of equal opportunities, health, and dignity for all individuals.',
      trim: true,
    },
    stats: {
      livesImpacted: {
        type: Number,
        default: 0,
      },
      volunteersCount: {
        type: Number,
        default: 0,
      },
      projectsCompleted: {
        type: Number,
        default: 0,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const CmsConfig = mongoose.model('CmsConfig', cmsConfigSchema);
export default CmsConfig;
