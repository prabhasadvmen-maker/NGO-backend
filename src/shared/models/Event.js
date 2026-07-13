import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date and time is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date and time is required'],
    },
    location: {
      type: String,
      required: [true, 'Location/Venue is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Online', 'Offline', 'Hybrid'],
      default: 'Offline',
    },
    capacity: {
      type: Number,
      default: 0, // 0 means unlimited capacity
      min: [0, 'Capacity cannot be negative'],
    },
    registrationsCount: {
      type: Number,
      default: 0,
      min: [0, 'Registrations count cannot be negative'],
    },
    status: {
      type: String,
      enum: ['Planned', 'Active', 'Completed', 'Cancelled'],
      default: 'Planned',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
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

const Event = mongoose.model('Event', eventSchema);
export default Event;
