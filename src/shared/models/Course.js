import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Course category is required'],
      enum: [
        'Artificial Intelligence',
        'Web Development',
        'App Development',
        'Digital Marketing',
        'Video Editing',
        'Prompt Engineering',
        'Data Analytics',
        'Graphic Design',
        'Tailoring & Crafts',
        'Computer Literacy',
        'Healthcare & Wellness',
        'Spoken English',
        'Electrician & Repair',
        'Organic Farming',
        'Soft Skills'
      ],
      trim: true,
    },
    instructor: {
      type: String,
      required: [true, 'Instructor name is required'],
      trim: true,
    },
    duration: {
      type: String,
      default: '3 Months',
      trim: true,
    },
    totalLessons: {
      type: Number,
      default: 24,
    },
    mode: {
      type: String,
      enum: ['Online', 'Offline', 'Hybrid'],
      default: 'Offline',
    },
    language: {
      type: String,
      enum: ['Hindi', 'English', 'Hindi + English'],
      default: 'Hindi',
    },
    thumbnailUrl: {
      type: String,
      default: '',
      trim: true,
    },
    introVideoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    totalSeats: {
      type: Number,
      default: 50,
    },
    enrolledCount: {
      type: Number,
      default: 0,
    },
    eligibility: {
      type: String,
      enum: ['Anyone', '10th Pass', '12th Pass', 'Graduate'],
      default: 'Anyone',
    },
    ageMin: {
      type: Number,
      default: 14,
    },
    ageMax: {
      type: Number,
      default: 60,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    status: {
      type: String,
      enum: ['Active', 'Upcoming', 'Completed'],
      default: 'Active',
    },
    syllabus: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Course = mongoose.model('Course', courseSchema);
export default Course;
