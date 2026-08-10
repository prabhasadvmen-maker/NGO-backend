import mongoose from 'mongoose';

const courseEnrollmentSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: String,
      unique: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    courseTitle: {
      type: String,
      trim: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    age: {
      type: Number,
      default: 20,
    },
    education: {
      type: String,
      default: '12th Pass',
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      default: 'Uttar Pradesh',
      trim: true,
    },
    whyCourse: {
      type: String,
      trim: true,
      default: 'Seeking skill acquisition for better employment opportunities.',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
      default: 'Pending',
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    certificateId: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

courseEnrollmentSchema.pre('save', async function (next) {
  if (!this.enrollmentId) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('CourseEnrollment').countDocuments();
      const sequence = String(count + 1).padStart(5, '0');
      this.enrollmentId = `ENR-${year}-${sequence}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
export default CourseEnrollment;
