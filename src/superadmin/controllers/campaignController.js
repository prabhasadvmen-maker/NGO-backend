import Campaign from '../../shared/models/Campaign.js';
import Donation from '../../shared/models/Donation.js';
import Branch from '../../shared/models/Branch.js';

// Sanitize body fields
function sanitizeBody(body) {
  const optionalFields = ['branch', 'endDate'];
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

// GET /api/superadmin/campaigns
export const getAllCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status) filter.status = status;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get all campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
};

// GET /api/superadmin/campaigns/stats
export const getCampaignStats = async (req, res) => {
  try {
    const totalCount = await Campaign.countDocuments();
    const activeCount = await Campaign.countDocuments({ status: 'Active' });
    const plannedCount = await Campaign.countDocuments({ status: 'Planned' });
    const completedCount = await Campaign.countDocuments({ status: 'Completed' });
    const suspendedCount = await Campaign.countDocuments({ status: 'Suspended' });

    // Aggregate target and raised amounts
    const aggregatedStats = await Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalTarget: { $sum: '$targetAmount' },
          totalRaised: { $sum: '$raisedAmount' },
        }
      }
    ]);

    const stats = {
      totalCount,
      activeCount,
      plannedCount,
      completedCount,
      suspendedCount,
      totalTarget: aggregatedStats[0]?.totalTarget || 0,
      totalRaised: aggregatedStats[0]?.totalRaised || 0,
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Superadmin get campaign stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/superadmin/campaigns
export const createCampaign = async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    
    const campaign = new Campaign({
      ...sanitized,
      createdBy: req.user.id
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Superadmin create campaign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create campaign' });
  }
};

// PUT /api/superadmin/campaigns/:id
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeBody(req.body);

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      {
        ...sanitized,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Superadmin update campaign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update campaign' });
  }
};

// DELETE /api/superadmin/campaigns/:id
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Safely detach this campaign from associated donations
    await Donation.updateMany({ campaign: id }, { $set: { campaign: null } });

    res.json({
      success: true,
      message: 'Campaign deleted successfully. Associated donations detached.'
    });
  } catch (error) {
    console.error('Superadmin delete campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
};

// GET /api/superadmin/campaigns/:id/contributions
export const getCampaignContributions = async (req, res) => {
  try {
    const { id } = req.params;
    const { search = '', status = '' } = req.query;

    const filter = { campaign: id };
    if (status) filter.paymentStatus = status;

    if (search) {
      filter.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    const contributions = await Donation.find(filter)
      .populate('branch', 'name code')
      .populate('createdBy', 'name email')
      .sort({ donationDate: -1 })
      .lean();

    res.json({
      success: true,
      data: contributions
    });
  } catch (error) {
    console.error('Superadmin get campaign contributions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
};
