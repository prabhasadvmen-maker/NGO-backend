import Donation from '../../shared/models/Donation.js';
import Branch from '../../shared/models/Branch.js';

// Sanitize optional fields to null
function sanitizeBody(body) {
  const optionalFields = ['donorEmail', 'donorPhone', 'transactionId', 'branch', 'notes'];
  const sanitized = { ...body };
  optionalFields.forEach(f => {
    if (sanitized[f] === '') {
      sanitized[f] = null;
    } else if (sanitized[f] === undefined) {
      delete sanitized[f];
    }
  });
  return sanitized;
}

// GET /api/admin/donations
export const getAllDonations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      paymentStatus = '', 
      paymentMethod = '', 
      purpose = '', 
      startDate, 
      endDate 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Strict scoping to creator
    const filter = { createdBy: req.user.id };

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (purpose) filter.purpose = purpose;

    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.donationDate = {};
      if (startDate) filter.donationDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.donationDate.$lte = end;
      }
    }

    const [donations, total] = await Promise.all([
      Donation.find(filter)
        .populate('branch', 'name code')
        .sort({ donationDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Donation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: donations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Admin get all donations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
};

// GET /api/admin/donations/stats
export const getDonationStats = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    const totalCount = await Donation.countDocuments(filter);
    const completedCount = await Donation.countDocuments({ ...filter, paymentStatus: 'completed' });
    const pendingCount = await Donation.countDocuments({ ...filter, paymentStatus: 'pending' });

    // Aggregate total amount
    const amountStats = await Donation.aggregate([
      { $match: { createdBy: req.user.id, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = amountStats[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalCount,
        completedCount,
        pendingCount,
        totalAmount,
      }
    });
  } catch (error) {
    console.error('Admin get donation stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// GET /api/admin/donations/:id
export const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('branch', 'name code city state');

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found or unauthorized' });
    }

    res.json({ success: true, data: donation });
  } catch (error) {
    console.error('Admin get donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve donation' });
  }
};

// POST /api/admin/donations
export const createDonation = async (req, res) => {
  try {
    const { donorName, amount, paymentMethod } = req.body;

    if (!donorName || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Donor name, amount, and payment method are required' });
    }

    const adminBranch = await Branch.findOne({ branchHead: req.user.id });
    const branchId = adminBranch ? adminBranch._id : null;

    const donation = new Donation({
      ...sanitizeBody(req.body),
      branch: branchId,
      createdBy: req.user.id
    });

    await donation.save();

    res.status(201).json({
      success: true,
      message: 'Donation recorded successfully',
      data: donation
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Admin create donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
};

// PUT /api/admin/donations/:id
export const updateDonation = async (req, res) => {
  try {
    const adminBranch = await Branch.findOne({ branchHead: req.user.id });
    const branchId = adminBranch ? adminBranch._id : null;

    const updateData = sanitizeBody(req.body);
    if (branchId) {
      updateData.branch = branchId;
    }

    const donation = await Donation.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Donation updated successfully',
      data: donation
    });
  } catch (error) {
    console.error('Admin update donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to update donation' });
  }
};

// DELETE /api/admin/donations/:id
export const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found or unauthorized' });
    }

    res.json({ success: true, message: 'Donation record deleted successfully' });
  } catch (error) {
    console.error('Admin delete donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete donation' });
  }
};
