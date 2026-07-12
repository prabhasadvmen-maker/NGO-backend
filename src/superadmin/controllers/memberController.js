import jwt from 'jsonwebtoken';
import Member from '../../shared/models/Member.js';
import MembershipType from '../../shared/models/MembershipType.js';
import Branch from '../../shared/models/Branch.js';
import { getViewPresignedUrl, deleteObject } from '../../utils/r2.js';

// Sanitize empty strings to null for optional fields
function sanitizeBody(body) {
  const optionalFields = [
    'email', 'gender', 'pinCode', 'dateOfBirth', 'expiryDate', 
    'address', 'state', 'district', 'occupation', 'referredBy', 'branch'
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

// GET /api/superadmin/members
export const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', membershipType = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (membershipType) filter.membershipType = membershipType;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
      ];
    }

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Member.countDocuments(filter),
    ]);

    // Attach presigned view URLs for photos
    const membersWithUrls = await Promise.all(
      members.map(async (m) => ({
        ...m,
        photoUrl: m.profilePhoto ? await getViewPresignedUrl(m.profilePhoto) : null,
      }))
    );

    res.json({
      success: true,
      data: membersWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
};

// GET /api/superadmin/members/stats
export const getMemberStats = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: 'Active' });
    const pendingMembers = await Member.countDocuments({ status: 'Pending' });
    const inactiveMembers = await Member.countDocuments({ status: 'Inactive' });

    // Calculate total fees collected
    const totalFeesResult = await Member.aggregate([
      { $group: { _id: null, total: { $sum: '$membershipFee' } } }
    ]);
    const totalFeesCollected = totalFeesResult[0]?.total || 0;

    // Calculate plans breakdown
    const plansBreakdown = await Member.aggregate([
      { $group: { _id: '$membershipType', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        pendingMembers,
        inactiveMembers,
        totalFeesCollected,
        plansBreakdown,
      },
    });
  } catch (error) {
    console.error('Superadmin get member stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch member statistics' });
  }
};

// GET /api/superadmin/members/:id
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('branch', 'name code city state')
      .populate('createdBy', 'name email role')
      .lean();

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const photoUrl = member.profilePhoto ? await getViewPresignedUrl(member.profilePhoto) : null;

    res.json({
      success: true,
      data: {
        ...member,
        photoUrl,
      },
    });
  } catch (error) {
    console.error('Superadmin get member by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch member details' });
  }
};

// PUT /api/superadmin/members/:id
export const updateMember = async (req, res) => {
  try {
    const { membershipType, branch } = req.body;

    // Validate membershipType exists if it's changing
    if (membershipType) {
      const typeExists = await MembershipType.findOne({ name: membershipType, isActive: true });
      if (!typeExists) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive membership type: ${membershipType}`
        });
      }
      req.body.membershipFee = typeExists.annualFee;
    }

    // Validate branch exists if provided
    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({
          success: false,
          message: 'Selected branch does not exist'
        });
      }
    }

    const member = await Member.findById(req.params.id).select('+password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const sanitized = sanitizeBody(req.body);

    // Clean up old photo if updated/removed
    if (sanitized.profilePhoto && sanitized.profilePhoto !== member.profilePhoto && member.profilePhoto) {
      await deleteObject(member.profilePhoto).catch(() => {});
    }

    // If password provided, update it. If empty string/null, delete to prevent overriding with blank string
    if (!sanitized.password) {
      delete sanitized.password;
    }

    Object.assign(member, sanitized);
    await member.save();

    const photoUrl = member.profilePhoto ? await getViewPresignedUrl(member.profilePhoto) : null;

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: {
        ...member.toObject(),
        photoUrl,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Member with this mobile or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Superadmin update member error:', error);
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
};

// DELETE /api/superadmin/members/:id
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.profilePhoto) {
      await deleteObject(member.profilePhoto).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Member deleted successfully',
    });
  } catch (error) {
    console.error('Superadmin delete member error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
};

// PATCH /api/superadmin/members/:id/toggle-status
export const toggleMemberStatus = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Toggle between Active and Inactive
    member.status = member.status === 'Active' ? 'Inactive' : 'Active';
    await member.save();

    res.json({
      success: true,
      message: `Member status updated to ${member.status}`,
      data: { status: member.status },
    });
  } catch (error) {
    console.error('Superadmin toggle status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update member status' });
  }
};

// POST /api/superadmin/members/:id/login-as
export const loginAsMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.status !== 'Active') {
      return res.status(403).json({ success: false, message: `Member account is ${member.status}, cannot impersonate.` });
    }
    if (!member.email) {
      return res.status(403).json({ success: false, message: 'Member does not have an email configured for login.' });
    }

    const token = jwt.sign(
      { id: member._id, email: member.email, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: `Impersonated as ${member.fullName}`,
      token,
      user: {
        id: member._id,
        memberId: member.memberId,
        name: member.fullName,
        email: member.email,
        role: 'member',
      },
    });
  } catch (error) {
    console.error('Superadmin impersonate member error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
