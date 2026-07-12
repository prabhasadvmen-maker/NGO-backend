import { v4 as uuidv4 } from 'uuid';
import Beneficiary from '../../shared/models/Beneficiary.js';
import Branch from '../../shared/models/Branch.js';
import { getViewPresignedUrl, deleteObject, getUploadPresignedUrl } from '../../utils/r2.js';

// Sanitize body values to null for empty optional fields
function sanitizeBody(body) {
  const optionalFields = [
    'email', 'gender', 'pinCode', 'dateOfBirth', 
    'address', 'city', 'district', 'state', 'profilePhoto', 'category'
  ];
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

// GET /api/superadmin/beneficiaries/upload-url
export const getUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WEBP images are allowed' });
    }
    const ext = fileName.split('.').pop();
    const key = `beneficiaries/photos/${uuidv4()}.${ext}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);
    res.json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Beneficiary upload URL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// GET /api/superadmin/beneficiaries
export const getBeneficiaries = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', category = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { beneficiaryId: { $regex: search, $options: 'i' } },
      ];
    }

    const [beneficiaries, total] = await Promise.all([
      Beneficiary.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Beneficiary.countDocuments(filter),
    ]);

    // Attach presigned view URLs for profile photos
    const beneficiariesWithUrls = await Promise.all(
      beneficiaries.map(async (b) => ({
        ...b,
        photoUrl: b.profilePhoto ? await getViewPresignedUrl(b.profilePhoto) : null,
      }))
    );

    res.json({
      success: true,
      data: beneficiariesWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get beneficiaries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch beneficiaries' });
  }
};

// GET /api/superadmin/beneficiaries/stats
export const getBeneficiaryStats = async (req, res) => {
  try {
    const totalBeneficiaries = await Beneficiary.countDocuments();
    const activeBeneficiaries = await Beneficiary.countDocuments({ status: 'Active' });
    const inactiveBeneficiaries = await Beneficiary.countDocuments({ status: 'Inactive' });

    // Aggregate primary category counts
    const categoryAggregation = await Beneficiary.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const categoriesBreakdown = categoryAggregation.map(c => ({ name: c._id || 'Healthcare', count: c.count }));

    res.json({
      success: true,
      data: {
        totalBeneficiaries,
        activeBeneficiaries,
        inactiveBeneficiaries,
        categoriesBreakdown,
      },
    });
  } catch (error) {
    console.error('Superadmin get beneficiary stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch beneficiary statistics' });
  }
};

// GET /api/superadmin/beneficiaries/:id
export const getBeneficiaryById = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id)
      .populate('branch', 'name code city state')
      .populate('createdBy', 'name email role')
      .lean();

    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    const photoUrl = beneficiary.profilePhoto ? await getViewPresignedUrl(beneficiary.profilePhoto) : null;

    res.json({
      success: true,
      data: {
        ...beneficiary,
        photoUrl,
      },
    });
  } catch (error) {
    console.error('Superadmin get beneficiary by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch beneficiary details' });
  }
};

// POST /api/superadmin/beneficiaries
export const createBeneficiary = async (req, res) => {
  try {
    const { fullName, mobileNumber, branch } = req.body;

    if (!fullName || !mobileNumber || !branch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Full name, mobile number, and branch assignment are required fields' 
      });
    }

    // Verify branch exists
    const branchExists = await Branch.findById(branch);
    if (!branchExists) {
      return res.status(400).json({ success: false, message: 'Assigned branch does not exist' });
    }

    const sanitized = sanitizeBody(req.body);
    const beneficiary = new Beneficiary({
      ...sanitized,
      createdBy: req.user.id
    });

    await beneficiary.save();

    res.status(201).json({
      success: true,
      message: 'Beneficiary registered successfully',
      data: beneficiary,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Beneficiary with this mobile number or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Superadmin create beneficiary error:', error);
    res.status(500).json({ success: false, message: 'Failed to register beneficiary' });
  }
};

// PUT /api/superadmin/beneficiaries/:id
export const updateBeneficiary = async (req, res) => {
  try {
    const { branch } = req.body;

    // Verify branch if changed
    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ success: false, message: 'Assigned branch does not exist' });
      }
    }

    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    const sanitized = sanitizeBody(req.body);

    // Clean up old photo if updated/removed
    if (sanitized.profilePhoto && sanitized.profilePhoto !== beneficiary.profilePhoto && beneficiary.profilePhoto) {
      await deleteObject(beneficiary.profilePhoto).catch(() => {});
    }

    Object.assign(beneficiary, sanitized);
    await beneficiary.save();

    const photoUrl = beneficiary.profilePhoto ? await getViewPresignedUrl(beneficiary.profilePhoto) : null;

    res.json({
      success: true,
      message: 'Beneficiary updated successfully',
      data: {
        ...beneficiary.toObject(),
        photoUrl,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Beneficiary with this mobile number or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Superadmin update beneficiary error:', error);
    res.status(500).json({ success: false, message: 'Failed to update beneficiary' });
  }
};

// DELETE /api/superadmin/beneficiaries/:id
export const deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findByIdAndDelete(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    if (beneficiary.profilePhoto) {
      await deleteObject(beneficiary.profilePhoto).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Beneficiary deleted successfully',
    });
  } catch (error) {
    console.error('Superadmin delete beneficiary error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete beneficiary' });
  }
};

// PATCH /api/superadmin/beneficiaries/:id/toggle-status
export const toggleBeneficiaryStatus = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    // Toggle status
    beneficiary.status = beneficiary.status === 'Active' ? 'Inactive' : 'Active';
    await beneficiary.save();

    res.json({
      success: true,
      message: `Beneficiary status updated to ${beneficiary.status}`,
      data: { status: beneficiary.status },
    });
  } catch (error) {
    console.error('Superadmin toggle status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update beneficiary status' });
  }
};
