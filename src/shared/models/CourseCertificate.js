import mongoose from 'mongoose';

const courseCertificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      unique: true,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseEnrollment',
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Skill Development',
      trim: true,
    },
    duration: {
      type: String,
      default: '3 Months',
      trim: true,
    },
    completionDate: {
      type: Date,
      default: Date.now,
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B', 'Pass'],
      default: 'A+',
    },
    status: {
      type: String,
      enum: ['Verified', 'Revoked'],
      default: 'Verified',
    },
    revokedReason: {
      type: String,
      default: '',
      trim: true,
    },
    instructorName: {
      type: String,
      default: 'Savitram Foundation Faculty',
      trim: true,
    },
  },
  { timestamps: true }
);

courseCertificateSchema.pre('save', async function (next) {
  if (!this.certificateId) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('CourseCertificate').countDocuments();
      const sequence = String(count + 1).padStart(5, '0');
      this.certificateId = `CERT-${year}-${sequence}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const CourseCertificate = mongoose.model('CourseCertificate', courseCertificateSchema);
export default CourseCertificate;
