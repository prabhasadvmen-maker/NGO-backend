import mongoose from 'mongoose';
import FoodDonation from '../../shared/models/FoodDonation.js';
import DonationStatusHistory from '../../shared/models/DonationStatusHistory.js';
import VolunteerAssignment from '../../shared/models/VolunteerAssignment.js';
import Volunteer from '../../shared/models/Volunteer.js';
import { sendDonationStatusUpdateEmail, sendVolunteerAssignmentNotification } from '../../utils/sendgrid.js';
import { getViewPresignedUrl } from '../../utils/r2.js';

/**
 * Get all Food Donations for Admin Dashboard
 * GET /api/admin/food-donations
 */
export const getAllDonations = async (req, res) => {
  try {
    const { status, priority, city, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (city) filter.city = new RegExp(city, 'i');

    if (search) {
      filter.$or = [
        { donationId: new RegExp(search, 'i') },
        { donorName: new RegExp(search, 'i') },
        { donorPhone: new RegExp(search, 'i') },
        { donorEmail: new RegExp(search, 'i') },
        { pickupAddress: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await FoodDonation.countDocuments(filter);
    const donations = await FoodDonation.find(filter)
      .populate('assignedVolunteer', 'fullName mobileNumber email city volunteerId profilePhoto')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: {
        donations,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin food donations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch food donations',
      error: error.message,
    });
  }
};

/**
 * Get Pending Donations for Verification Queue
 * GET /api/admin/food-donations/pending
 */
export const getPendingDonations = async (req, res) => {
  try {
    const pendingDonations = await FoodDonation.find({ status: 'Pending' }).sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      data: pendingDonations,
    });
  } catch (error) {
    console.error('Error fetching pending donations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending donations',
      error: error.message,
    });
  }
};

/**
 * Get Food Donation Details by ID
 * GET /api/admin/food-donations/:id
 */
export const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { $or: [{ _id: id }, { donationId: id }] }
      : { donationId: id };

    const donation = await FoodDonation.findOne(query)
      .populate('assignedVolunteer', 'fullName mobileNumber email city profilePhoto volunteerId')
      .populate('verifiedBy', 'name email');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation record not found',
      });
    }

    const history = await DonationStatusHistory.find({ donation: donation._id }).sort({ createdAt: 1 });

    const photoUrls = await Promise.all((donation.foodPhotos || []).map((k) => getViewPresignedUrl(k)));
    const collectionUrls = await Promise.all((donation.collectionProofPhotos || []).map((k) => getViewPresignedUrl(k)));
    const distributionUrls = await Promise.all((donation.distributionProofPhotos || []).map((k) => getViewPresignedUrl(k)));

    return res.status(200).json({
      success: true,
      data: {
        donation,
        history,
        photoUrls: photoUrls.filter(Boolean),
        collectionUrls: collectionUrls.filter(Boolean),
        distributionUrls: distributionUrls.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching donation details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch donation details',
      error: error.message,
    });
  }
};

/**
 * Verify or Reject Food Donation
 * PUT /api/admin/food-donations/:id/verify
 */
export const verifyDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, priority, internalNotes } = req.body; // action: 'approve' | 'reject'

    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { $or: [{ _id: id }, { donationId: id }] }
      : { donationId: id };

    const donation = await FoodDonation.findOne(query);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation not found',
      });
    }

    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const validUserId = (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null;

    if (action === 'approve') {
      donation.status = 'Verified';
      if (validUserId) donation.verifiedBy = validUserId;
      donation.verifiedAt = new Date();
      if (priority) donation.priority = priority;
      if (internalNotes) donation.internalNotes = internalNotes;
      await donation.save();

      await DonationStatusHistory.create({
        donation: donation._id,
        status: 'Verified',
        changedBy: validUserId,
        changedByRole: 'Admin',
        notes: internalNotes || 'Donation details verified by admin.',
      });

      sendDonationStatusUpdateEmail(donation, 'Verified', 'Your donation has been verified. We are dispatching a volunteer for pickup.').catch(console.error);
    } else if (action === 'reject') {
      donation.status = 'Rejected';
      donation.rejectionReason = rejectionReason || 'Information incomplete or outside service area';
      await donation.save();

      await DonationStatusHistory.create({
        donation: donation._id,
        status: 'Rejected',
        changedBy: validUserId,
        changedByRole: 'Admin',
        notes: rejectionReason || 'Rejected by admin verification team.',
      });

      sendDonationStatusUpdateEmail(donation, 'Rejected', rejectionReason).catch(console.error);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Donation ${action === 'approve' ? 'verified' : 'rejected'} successfully`,
      data: donation,
    });
  } catch (error) {
    console.error('Error verifying donation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update donation verification status',
      error: error.message,
    });
  }
};

/**
 * Assign Volunteer to Donation
 * PUT /api/admin/food-donations/:id/assign-volunteer
 */
export const assignVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    const { volunteerId, notes } = req.body;

    if (!volunteerId) {
      return res.status(400).json({
        success: false,
        message: 'volunteerId is required',
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { $or: [{ _id: id }, { donationId: id }] }
      : { donationId: id };

    const donation = await FoodDonation.findOne(query);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation not found',
      });
    }

    const volunteer = await Volunteer.findById(volunteerId);
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer record not found',
      });
    }

    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const validUserId = (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : null;

    donation.assignedVolunteer = volunteer._id;
    donation.assignedAt = new Date();
    donation.status = 'Assigned';
    await donation.save();

    // Upsert VolunteerAssignment log
    await VolunteerAssignment.create({
      donation: donation._id,
      volunteer: volunteer._id,
      status: 'Assigned',
      assignedAt: new Date(),
      notes: notes || 'Assigned by admin team',
    });

    await DonationStatusHistory.create({
      donation: donation._id,
      status: 'Assigned',
      changedBy: validUserId,
      changedByRole: 'Admin',
      notes: `Assigned volunteer: ${volunteer.fullName} (${volunteer.mobileNumber})`,
    });

    // Send notifications to donor and volunteer
    sendDonationStatusUpdateEmail(donation, 'Assigned', `Volunteer ${volunteer.fullName} has been assigned for pickup. Contact: ${volunteer.mobileNumber}`).catch(console.error);
    sendVolunteerAssignmentNotification(donation, volunteer).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Volunteer assigned successfully',
      data: donation,
    });
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign volunteer',
      error: error.message,
    });
  }
};

/**
 * Get Available Volunteers for Assignment
 * GET /api/admin/volunteers/available
 */
export const getAvailableVolunteers = async (req, res) => {
  try {
    const { city } = req.query;
    const filter = { status: 'Active' };
    if (city) filter.city = new RegExp(city, 'i');

    const volunteers = await Volunteer.find(filter).select('fullName mobileNumber email city district status availability volunteerId profilePhoto');

    return res.status(200).json({
      success: true,
      data: volunteers,
    });
  } catch (error) {
    console.error('Error fetching available volunteers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available volunteers',
      error: error.message,
    });
  }
};

/**
 * Delete Food Donation
 * DELETE /api/admin/food-donations/:id
 */
export const deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { $or: [{ _id: id }, { donationId: id }] }
      : { donationId: id };

    const donation = await FoodDonation.findOneAndDelete(query);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Food donation record not found',
      });
    }

    // Clean up related status history & volunteer assignment records
    await Promise.all([
      DonationStatusHistory.deleteMany({ donation: donation._id }),
      VolunteerAssignment.deleteMany({ donation: donation._id }),
    ]).catch(console.error);

    return res.status(200).json({
      success: true,
      message: `Donation ${donation.donationId || ''} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting food donation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete food donation',
      error: error.message,
    });
  }
};
