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

// GET /api/superadmin/donations
export const getAllDonations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      paymentStatus = '', 
      paymentMethod = '', 
      purpose = '', 
      branch = '', 
      startDate, 
      endDate 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (purpose) filter.purpose = purpose;
    if (branch) filter.branch = branch;

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
        .populate('createdBy', 'name email')
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
    console.error('Superadmin get all donations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
};

// GET /api/superadmin/donations/stats
export const getDonationStats = async (req, res) => {
  try {
    const totalCount = await Donation.countDocuments();
    const completedCount = await Donation.countDocuments({ paymentStatus: 'completed' });
    const pendingCount = await Donation.countDocuments({ paymentStatus: 'pending' });

    // Aggregate total amount
    const amountStats = await Donation.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = amountStats[0]?.total || 0;

    // Aggregate by payment method
    const methodStats = await Donation.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Aggregate by purpose
    const purposeStats = await Donation.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: '$purpose', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = await Donation.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          donationDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$donationDate' },
            month: { $month: '$donationDate' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        completedCount,
        pendingCount,
        totalAmount,
        methodBreakdown: methodStats,
        purposeBreakdown: purposeStats,
        monthlyTrend: monthlyStats,
      }
    });
  } catch (error) {
    console.error('Superadmin get donation stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// GET /api/superadmin/donations/:id
export const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('branch', 'name code city state')
      .populate('createdBy', 'name email role');

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    res.json({ success: true, data: donation });
  } catch (error) {
    console.error('Superadmin get donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve donation' });
  }
};

// POST /api/superadmin/donations
export const createDonation = async (req, res) => {
  try {
    const { donorName, amount, paymentMethod, branch } = req.body;

    if (!donorName || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Donor name, amount, and payment method are required' });
    }

    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID' });
      }
    }

    const donation = new Donation({
      ...sanitizeBody(req.body),
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
    console.error('Superadmin create donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
};

// PUT /api/superadmin/donations/:id
export const updateDonation = async (req, res) => {
  try {
    const { branch } = req.body;
    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID' });
      }
    }

    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { $set: sanitizeBody(req.body) },
      { new: true, runValidators: true }
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    res.json({
      success: true,
      message: 'Donation updated successfully',
      data: donation
    });
  } catch (error) {
    console.error('Superadmin update donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to update donation' });
  }
};

// DELETE /api/superadmin/donations/:id
export const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    res.json({ success: true, message: 'Donation record deleted successfully' });
  } catch (error) {
    console.error('Superadmin delete donation error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete donation' });
  }
};
