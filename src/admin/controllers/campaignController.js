import Campaign from '../../shared/models/Campaign.js';
import Donation from '../../shared/models/Donation.js';

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

// GET /api/admin/campaigns
export const getAllCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      startDate,
      endDate,
      myCampaignsOnly = 'false'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (myCampaignsOnly === 'true') {
      filter.createdBy = req.user.id;
    }
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
    console.error('Admin get all campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
};

// GET /api/admin/campaigns/stats
export const getCampaignStats = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    const totalCount = await Campaign.countDocuments(filter);
    const activeCount = await Campaign.countDocuments({ ...filter, status: 'Active' });
    const completedCount = await Campaign.countDocuments({ ...filter, status: 'Completed' });

    // Target vs Raised aggregates
    const aggregatedStats = await Campaign.aggregate([
      { $match: filter },
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
      completedCount,
      totalTarget: aggregatedStats[0]?.totalTarget || 0,
      totalRaised: aggregatedStats[0]?.totalRaised || 0,
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin get campaign stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/admin/campaigns
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
    console.error('Admin create campaign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create campaign' });
  }
};

// PUT /api/admin/campaigns/:id
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeBody(req.body);

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      {
        ...sanitized,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Admin update campaign error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update campaign' });
  }
};

// DELETE /api/admin/campaigns/:id
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized' });
    }

    // Detach from donations
    await Donation.updateMany({ campaign: id }, { $set: { campaign: null } });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
};

// POST /api/admin/campaigns/:id/contributions
export const addCampaignContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorName, donorEmail, donorPhone, amount, paymentMethod, paymentStatus, notes, branch } = req.body;

    if (!donorName || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Donor name, amount, and payment method are required' });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.status === 'Completed' || campaign.status === 'Suspended') {
      return res.status(400).json({ success: false, message: `This campaign is currently ${campaign.status}` });
    }

    // Create donation
    const donation = new Donation({
      donorName,
      donorEmail: donorEmail || null,
      donorPhone: donorPhone || null,
      amount: parseFloat(amount),
      paymentMethod,
      paymentStatus: paymentStatus || 'completed',
      purpose: `Crowdfunding: ${campaign.title}`,
      campaign: id,
      branch: branch || campaign.branch || null,
      notes: notes || null,
      createdBy: req.user.id
    });

    await donation.save();

    // If payment is completed, increase campaign raised amount
    if (donation.paymentStatus === 'completed') {
      campaign.raisedAmount += donation.amount;
      await campaign.save();
    }

    res.status(201).json({
      success: true,
      message: 'Campaign contribution recorded successfully',
      data: donation
    });
  } catch (error) {
    console.error('Admin add campaign contribution error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record contribution' });
  }
};

// GET /api/admin/campaigns/:id/contributions
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
        { receiptNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const contributions = await Donation.find(filter)
      .populate('createdBy', 'name email')
      .sort({ donationDate: -1 })
      .lean();

    res.json({
      success: true,
      data: contributions
    });
  } catch (error) {
    console.error('Admin get campaign contributions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
};
