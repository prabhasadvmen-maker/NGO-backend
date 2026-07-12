import mongoose from 'mongoose';

const ngoProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'NGO Name is required'],
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: null,
    },
    registrationDate: {
      type: Date,
      default: null,
    },
    panNumber: {
      type: String,
      trim: true,
      default: null,
    },
    tanNumber: {
      type: String,
      trim: true,
      default: null,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Primary email is required'],
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
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
      default: null,
    },
    about: {
      type: String,
      trim: true,
      default: null,
    },
    mission: {
      type: String,
      trim: true,
      default: null,
    },
    vision: {
      type: String,
      trim: true,
      default: null,
    },
    logo: {
      type: String, // Cloudflare R2 Key
      default: null,
    },
    signature: {
      type: String, // Cloudflare R2 Key (authorized signature)
      default: null,
    },
    seal: {
      type: String, // Cloudflare R2 Key (authorized seal/stamp)
      default: null,
    },
    taxStatus: {
      is80GRegistered: {
        type: Boolean,
        default: false,
      },
      registrationNumber80G: {
        type: String,
        trim: true,
        default: null,
      },
      is12ARegistered: {
        type: Boolean,
        default: false,
      },
      registrationNumber12A: {
        type: String,
        trim: true,
        default: null,
      },
      csrNumber: {
        type: String,
        trim: true,
        default: null,
      },
      isFcraRegistered: {
        type: Boolean,
        default: false,
      },
      fcraNumber: {
        type: String,
        trim: true,
        default: null,
      },
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

const NgoProfile = mongoose.model('NgoProfile', ngoProfileSchema);
export default NgoProfile;
