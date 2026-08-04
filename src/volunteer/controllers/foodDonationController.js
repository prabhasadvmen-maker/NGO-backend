import mongoose from 'mongoose';
import FoodDonation from '../../shared/models/FoodDonation.js';
import DonationStatusHistory from '../../shared/models/DonationStatusHistory.js';
import VolunteerAssignment from '../../shared/models/VolunteerAssignment.js';
import Volunteer from '../../shared/models/Volunteer.js';
import { sendDonationStatusUpdateEmail, sendThankYouImpactEmail } from '../../utils/sendgrid.js';
import { getViewPresignedUrl } from '../../utils/r2.js';
import { sendDonationCompletionEmail } from '../../shared/services/emailService.js';

/**
 * Get Available Donations awaiting Volunteer Acceptance/Pickup
 * GET /api/volunteer/food-donations/available
 */
export const getAvailableDonations = async (req, res) => {
  try {
    const { city, priority, foodType, search } = req.query;
    const filter = {
      status: { $in: ['Verified', 'Pending', 'verified', 'pending'] },
    };
    if (city) filter.city = new RegExp(city, 'i');
    if (priority) filter.priority = new RegExp(priority, 'i');
    if (foodType) filter.foodType = new RegExp(foodType, 'i');
    if (search) {
      filter.$or = [
        { donorName: new RegExp(search, 'i') },
        { pickupAddress: new RegExp(search, 'i') },
        { _id: search.match(/^[a-f\d]{24}$/i) ? search : undefined },
      ].filter((c) => Object.values(c)[0] !== undefined);
    }

    const donations = await FoodDonation.find(filter).sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (error) {
    console.error('Error fetching available donations for volunteer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available donations',
      error: error.message,
    });
  }
};

/**
 * Volunteer accepts an available assignment
 * POST /api/volunteer/food-donations/:id/accept
 */
export const acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await FoodDonation.findById(id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation not found',
      });
    }

    if (donation.status === 'Assigned' && donation.assignedVolunteerUser?.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'This donation is already assigned to another volunteer',
      });
    }

    // Lookup volunteer doc by logged in Volunteer ID, User ID, or email
    let volunteer = await Volunteer.findOne({
      $or: [{ _id: req.user.id }, { createdBy: req.user.id }, { email: req.user.email }],
    });

    if (!volunteer) {
      // Create a temporary volunteer profile linked to user if needed
      volunteer = new Volunteer({
        fullName: req.user.name || 'Volunteer',
        mobileNumber: req.user.mobileNumber || '9876543210',
        email: req.user.email,
        branch: req.user.branch || undefined,
        createdBy: req.user.id,
        status: 'Active',
      });
      await volunteer.save().catch(() => {});
    }

    donation.assignedVolunteer = volunteer?._id || donation.assignedVolunteer;
    donation.assignedVolunteerUser = req.user.id;
    donation.assignedAt = donation.assignedAt || new Date();
    donation.status = 'Assigned';
    await donation.save();

    await VolunteerAssignment.findOneAndUpdate(
      { donation: donation._id },
      {
        donation: donation._id,
        volunteer: volunteer?._id,
        volunteerUser: req.user.id,
        status: 'Accepted',
        acceptedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await DonationStatusHistory.create({
      donation: donation._id,
      status: 'Assigned',
      changedBy: req.user.id,
      changedByRole: 'Volunteer',
      notes: 'Volunteer accepted donation pickup assignment',
    });

    sendDonationStatusUpdateEmail(donation, 'Assigned', 'Volunteer has accepted your food donation request and is on the way for pickup!').catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Assignment accepted successfully',
      data: donation,
    });
  } catch (error) {
    console.error('Error accepting volunteer assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept assignment',
      error: error.message,
    });
  }
};

/**
 * Mark Donation as Collected with Photo Proof
 * PUT /api/volunteer/food-donations/:id/collect
 */
export const collectDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectionProofPhotos, actualQuantityCollected, collectionNotes } = req.body;

    const donation = await FoodDonation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation not found',
      });
    }

    donation.status = 'Collected';
    donation.collectedAt = new Date();
    if (Array.isArray(collectionProofPhotos)) {
      donation.collectionProofPhotos = collectionProofPhotos;
    }
    if (actualQuantityCollected) {
      donation.actualQuantityCollected = actualQuantityCollected;
    }
    await donation.save();

    await VolunteerAssignment.findOneAndUpdate(
      { donation: donation._id },
      {
        status: 'Collected',
        collectedAt: new Date(),
        collectionProofPhotos: donation.collectionProofPhotos,
        actualQuantityCollected: donation.actualQuantityCollected,
        notes: collectionNotes || 'Collected by volunteer',
      }
    );

    await DonationStatusHistory.create({
      donation: donation._id,
      status: 'Collected',
      changedBy: req.user.id,
      changedByRole: 'Volunteer',
      notes: `Food collected by volunteer. Quantity: ${donation.actualQuantityCollected || donation.quantity}`,
    });

    sendDonationStatusUpdateEmail(donation, 'Collected', 'Volunteer has collected the food donation. En route for distribution!').catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Donation marked as collected',
      data: donation,
    });
  } catch (error) {
    console.error('Error collecting donation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update collection status',
      error: error.message,
    });
  }
};

/**
 * Mark Donation as Distributed with Beneficiary Stats & Photo Proof
 * PUT /api/volunteer/food-donations/:id/distribute
 */
export const distributeDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributionProofPhotos, actualPeopleServed, distributionNotes } = req.body;

    const donation = await FoodDonation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation not found',
      });
    }

    donation.status = 'Completed'; // Reaches Completed state
    donation.distributedAt = new Date();
    donation.completedAt = new Date();
    if (Array.isArray(distributionProofPhotos)) {
      donation.distributionProofPhotos = distributionProofPhotos;
    }
    if (actualPeopleServed) {
      donation.actualPeopleServed = Number(actualPeopleServed);
    } else {
      donation.actualPeopleServed = donation.estimatedPeopleServed || 25;
    }
    await donation.save();

    await VolunteerAssignment.findOneAndUpdate(
      { donation: donation._id },
      {
        status: 'Completed',
        distributedAt: new Date(),
        completedAt: new Date(),
        distributionProofPhotos: donation.distributionProofPhotos,
        actualPeopleServed: donation.actualPeopleServed,
        notes: distributionNotes || 'Distributed to beneficiaries successfully',
      }
    );

    await DonationStatusHistory.create({
      donation: donation._id,
      status: 'Completed',
      changedBy: req.user.id,
      changedByRole: 'Volunteer',
      notes: `Food distributed to ${donation.actualPeopleServed} beneficiaries. Impact report generated.`,
    });

    // Send final Thank You Email with Impact report to Donor
    sendThankYouImpactEmail(donation).catch(console.error);
    
    // Send completion notification email to donor via BREVO
    sendDonationCompletionEmail(donation).catch(err => 
      console.error('Error sending completion email:', err)
    );

    return res.status(200).json({
      success: true,
      message: 'Donation distribution completed successfully',
      data: donation,
    });

  } catch (error) {
    console.error('Error distributing donation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update distribution status',
      error: error.message,
    });
  }
};

/**
 * Get My Volunteer Assignments
 * GET /api/volunteer/food-donations/my-assignments
 */
export const getMyAssignments = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userEmail = req.user?.email;
    const userMobile = req.user?.mobileNumber || req.user?.mobile;

    // Find any matching Volunteer document by _id, createdBy, email, or mobile
    const volunteerDocs = await Volunteer.find({
      $or: [
        ...(userId && mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }, { createdBy: userId }] : []),
        ...(userEmail ? [{ email: userEmail }] : []),
        ...(userMobile ? [{ mobileNumber: userMobile }] : []),
      ],
    });

    const volunteerIds = volunteerDocs.map((v) => v._id);
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      volunteerIds.push(userId);
    }

    const filter = {
      $or: [
        { assignedVolunteer: { $in: volunteerIds } },
        { assignedVolunteerUser: { $in: volunteerIds } },
      ],
    };

    const donations = await FoodDonation.find(filter)
      .populate('assignedVolunteer', 'fullName email mobileNumber')
      .populate('assignedVolunteerUser', 'name email mobile')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (error) {
    console.error('Error fetching volunteer assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message,
    });
  }
};
