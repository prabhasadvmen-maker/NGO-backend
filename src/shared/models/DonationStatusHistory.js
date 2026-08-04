import mongoose from 'mongoose';

const donationStatusHistorySchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDonation',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'Assigned', 'Collected', 'Distributed', 'Completed', 'Cancelled'],
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByRole: {
      type: String,
      enum: ['Donor', 'Volunteer', 'Admin', 'Superadmin', 'System'],
      default: 'System',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const DonationStatusHistory = mongoose.model('DonationStatusHistory', donationStatusHistorySchema);
export default DonationStatusHistory;
