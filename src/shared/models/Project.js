import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Planned', 'Active', 'Completed', 'Suspended'],
      default: 'Planned',
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, 'Budget must be greater than or equal to 0'],
    },
    expenses: {
      type: Number,
      default: 0,
      min: [0, 'Expenses must be greater than or equal to 0'],
    },
    targetBeneficiaries: {
      type: Number,
      default: 0,
      min: [0, 'Target beneficiaries must be non-negative'],
    },
    actualBeneficiaries: {
      type: Number,
      default: 0,
      min: [0, 'Actual beneficiaries reached must be non-negative'],
    },
    volunteersCount: {
      type: Number,
      default: 0,
      min: [0, 'Volunteers count must be non-negative'],
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

const Project = mongoose.model('Project', projectSchema);
export default Project;
