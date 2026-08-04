import mongoose from 'mongoose';

const foodDonationSchema = new mongoose.Schema(
  {
    donationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Donor Details
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
    },
    donorPhone: {
      type: String,
      required: [true, 'Donor phone number is required'],
      trim: true,
      index: true,
    },
    donorEmail: {
      type: String,
      required: [true, 'Donor email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    organizationType: {
      type: String,
      enum: ['Hotel', 'Restaurant', 'Event Organizer', 'Individual', 'Corporate', 'Other'],
      default: 'Individual',
    },
    organizationName: {
      type: String,
      trim: true,
      default: '',
    },

    // Food Details
    foodType: {
      type: String,
      enum: ['Cooked Food', 'Packaged Food', 'Raw Ingredients', 'Bakery & Sweets', 'Beverages', 'Other'],
      required: [true, 'Food type is required'],
    },
    foodItemsDescription: {
      type: String,
      required: [true, 'Food description is required'],
    },
    quantity: {
      type: String,
      required: [true, 'Estimated quantity is required'], // e.g. "50 meals / 25 kg"
    },
    estimatedPeopleServed: {
      type: Number,
      default: 0,
    },
    actualQuantityCollected: {
      type: String,
      default: '',
    },
    actualPeopleServed: {
      type: Number,
      default: 0,
    },
    preparedDateTime: {
      type: Date,
      default: Date.now,
    },
    shelfLifeHours: {
      type: Number,
      default: 6,
    },

    // Event Details
    eventType: {
      type: String,
      enum: ['Wedding', 'Party', 'Corporate Event', 'Hotel Surplus', 'Restaurant Surplus', 'Household', 'Other'],
      default: 'Other',
    },

    // Pickup Location Details
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
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
    pinCode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
    },
    pickupTimeWindow: {
      type: String,
      required: [true, 'Pickup time window is required'], // e.g. "14:00 - 16:00"
    },
    pickupInstructions: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },

    // Urgency & Priority
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },

    // Status Tracking
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'Assigned', 'Collected', 'Distributed', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },

    // Photos (R2 Storage Keys or Presigned URLs)
    foodPhotos: {
      type: [String],
      default: [],
    },
    collectionProofPhotos: {
      type: [String],
      default: [],
    },
    distributionProofPhotos: {
      type: [String],
      default: [],
    },

    // Volunteer & Administrative Assignment
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
    assignedAt: {
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

    // Admin verification
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    // Notes
    internalNotes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique formatted donationId BEFORE validation
foodDonationSchema.pre('validate', async function (next) {
  if (!this.donationId) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('FoodDonation').countDocuments();
      const randomPart = Math.floor(100 + Math.random() * 900);
      this.donationId = `ANN-${year}-${String(count + 1).padStart(4, '0')}-${randomPart}`;
    } catch (err) {
      console.error('Error generating donationId:', err);
      return next(err);
    }
  }
  next();
});

const FoodDonation = mongoose.model('FoodDonation', foodDonationSchema);
export default FoodDonation;
