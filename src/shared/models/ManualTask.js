import mongoose from 'mongoose';

const manualTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
    },
    taskType: {
      type: String,
      enum: ['Event Setup', 'Attendance', 'Cleaning', 'Inventory', 'Distribution', 'Collection', 'Other'],
      required: [true, 'Task type is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    
    // Assignment Details
    assignedVolunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      default: null,
      index: true,
    },
    assignedVolunteerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    
    // Task Dates
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    startDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    
    // Location (if applicable)
    location: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    
    // Task Details
    estimatedHours: {
      type: Number,
      default: 2,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    
    // Proof & Documentation
    proofPhotos: {
      type: [String],
      default: [],
    },
    completionNotes: {
      type: String,
      default: '',
    },
    
    // Branch Association
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    
    // Additional Info
    internalNotes: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique taskId
manualTaskSchema.pre('validate', async function (next) {
  if (!this.taskId) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('ManualTask').countDocuments();
      const randomPart = Math.floor(100 + Math.random() * 900);
      this.taskId = `TASK-${year}-${String(count + 1).padStart(4, '0')}-${randomPart}`;
    } catch (err) {
      console.error('Error generating taskId:', err);
      return next(err);
    }
  }
  next();
});

const ManualTask = mongoose.model('ManualTask', manualTaskSchema);
export default ManualTask;
