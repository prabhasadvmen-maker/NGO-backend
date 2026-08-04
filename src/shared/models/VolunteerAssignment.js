import mongoose from 'mongoose';

const volunteerAssignmentSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDonation',
      required: true,
      index: true,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      required: true,
      index: true,
    },
    volunteerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['Assigned', 'Accepted', 'Collected', 'Distributed', 'Completed', 'Cancelled'],
      default: 'Assigned',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    distributedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    collectionProofPhotos: {
      type: [String],
      default: [],
    },
    distributionProofPhotos: {
      type: [String],
      default: [],
    },
    actualQuantityCollected: {
      type: String,
      default: '',
    },
    actualPeopleServed: {
      type: Number,
      default: 0,
    },
    volunteerHoursEarned: {
      type: Number,
      default: 1.5,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const VolunteerAssignment = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);
export default VolunteerAssignment;
