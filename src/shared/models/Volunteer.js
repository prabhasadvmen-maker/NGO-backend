import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema(
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
    volunteerId: {
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
    skills: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Weekends', 'Occasional'],
      default: 'Part-time',
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Inactive'],
      default: 'Pending',
    },
    joinedDate: {
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

// Auto-generate volunteerId before saving
volunteerSchema.pre('save', async function (next) {
  if (!this.volunteerId) {
    try {
      const count = await mongoose.model('Volunteer').countDocuments();
      const random = Math.floor(100 + Math.random() * 900); // 3-digit random component to avoid concurrency collisions
      this.volunteerId = `VOL${String(count + 1).padStart(4, '0')}${random}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Volunteer = mongoose.model('Volunteer', volunteerSchema);
export default Volunteer;
