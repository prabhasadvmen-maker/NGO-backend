import jwt from 'jsonwebtoken';
import Member from '../../shared/models/Member.js';
import MembershipType from '../../shared/models/MembershipType.js';
import Donation from '../../shared/models/Donation.js';
import { uploadToR2, getViewPresignedUrl, deleteObject } from '../../utils/r2.js';
import { v4 as uuidv4 } from 'uuid';

// POST /api/admin/members/upload - Backend handles R2 upload
export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WEBP images are allowed' });
    }

    const ext = req.file.originalname.split('.').pop();
    const key = `members/photos/${uuidv4()}.${ext}`;
    
    await uploadToR2(key, req.file.buffer, req.file.mimetype);
    
    res.json({ success: true, key, message: 'Photo uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

// Sanitize empty strings to null for optional fields (but preserve existing values if not provided)
function sanitizeBody(body) {
  const optionalFields = ['email', 'gender', 'pinCode', 'dateOfBirth', 'expiryDate', 'address', 'state', 'district', 'occupation', 'referredBy'];
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

// POST /api/admin/members
export const createMember = async (req, res) => {
  try {
    const { membershipType } = req.body;

    // Validate membershipType exists
    if (membershipType) {
      const typeExists = await MembershipType.findOne({ name: membershipType, isActive: true });
      if (!typeExists) {
        return res.status(400).json({
          success: false,
          message: `Invalid membership type: ${membershipType}`
        });
      }
      // Auto-set membershipFee from MembershipType
      req.body.membershipFee = typeExists.annualFee;
    }

    const member = new Member({ ...sanitizeBody(req.body), createdBy: req.user.id });
    await member.save();

    // Generate presigned view URL if photo exists
    let photoUrl = null;
    if (member.profilePhoto) {
      photoUrl = await getViewPresignedUrl(member.profilePhoto);
    }

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: { ...member.toObject(), photoUrl },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Member with this mobile/email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Create member error:', error);
    res.status(500).json({ success: false, message: 'Failed to create member' });
  }
};

// GET /api/admin/members
export const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', membershipType = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { createdBy: req.user.id };
    if (status) {
      if (status === 'Pending') {
        filter.$or = [
          { status: 'Pending' },
          { requestStatus: 'Pending' }
        ];
      } else {
        filter.status = status;
      }
    }
    if (membershipType) filter.membershipType = membershipType;
    if (search) {
      const searchFilter = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { mobileNumber: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { memberId: { $regex: search, $options: 'i' } },
        ]
      };
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          searchFilter
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter.$or;
      }
    }

    const [members, total] = await Promise.all([
      Member.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
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
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
};

// GET /api/admin/members/:id
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, createdBy: req.user.id }).lean();
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const photoUrl = member.profilePhoto ? await getViewPresignedUrl(member.profilePhoto) : null;
    res.json({ success: true, data: { ...member, photoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch member' });
  }
};

// PUT /api/admin/members/:id
export const updateMember = async (req, res) => {
  try {
    const { membershipType } = req.body;

    // Validate membershipType exists if being changed
    if (membershipType) {
      const typeExists = await MembershipType.findOne({ name: membershipType, isActive: true });
      if (!typeExists) {
        return res.status(400).json({
          success: false,
          message: `Invalid membership type: ${membershipType}`
        });
      }
      // Auto-set membershipFee from MembershipType
      req.body.membershipFee = typeExists.annualFee;
    }

    const existing = await Member.findOne({ _id: req.params.id, createdBy: req.user.id }).select('+password');
    if (!existing) return res.status(404).json({ success: false, message: 'Member not found' });

    const sanitized = sanitizeBody(req.body);

    // If photo key changed, delete old one from R2
    if (sanitized.profilePhoto && sanitized.profilePhoto !== existing.profilePhoto && existing.profilePhoto) {
      await deleteObject(existing.profilePhoto).catch(() => {});
    }

    // Don't overwrite password if not provided in request
    if (!sanitized.password) {
      delete sanitized.password;
    }

    Object.assign(existing, sanitized);
    await existing.save();

    const photoUrl = existing.profilePhoto ? await getViewPresignedUrl(existing.profilePhoto) : null;
    res.json({ success: true, message: 'Member updated successfully', data: { ...existing.toObject(), photoUrl } });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
};

// DELETE /api/admin/members/:id
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.profilePhoto) await deleteObject(member.profilePhoto).catch(() => {});
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
};

// POST /api/admin/members/:id/login-as
export const loginAsMember = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (member.status !== 'Active') {
      return res.status(403).json({ success: false, message: `Member account status is ${member.status}, cannot login.` });
    }
    if (!member.email) {
      return res.status(403).json({ success: false, message: 'Member does not have email configured for portal login.' });
    }

    const token = jwt.sign(
      { id: member._id, email: member.email, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: `Impersonated as ${member.fullName}`,
      token,
      user: {
        id: member._id,
        memberId: member.memberId,
        name: member.fullName,
        email: member.email,
        role: 'member'
      }
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/admin/members/:id/approve-request
export const approveMembershipRequest = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    if (!member.email) {
      return res.status(400).json({ success: false, message: 'Member must have an email address to approve. Please add email first.' });
    }

    member.requestStatus = 'Approved';
    member.status = 'Active';
    if (member.requestedMembershipType) {
      const plan = await MembershipType.findOne({ name: member.requestedMembershipType });
      const feeAmount = plan?.annualFee || member.membershipFee || 0;

      const paymentMethod = member.upgradePaymentMode === 'UPI' ? 'online' : (member.upgradePaymentMode === 'Bank Transfer' ? 'bank_transfer' : 'cash');
      const donation = new Donation({
        donorName: member.fullName,
        donorEmail: member.email,
        donorPhone: member.mobileNumber,
        amount: feeAmount,
        paymentMethod: paymentMethod,
        paymentStatus: 'completed',
        transactionId: member.upgradeTransactionId || `MEM-UPG-${Date.now()}`,
        purpose: `Membership Upgrade: ${member.requestedMembershipType}`,
        branch: member.branch,
        createdBy: req.user.id
      });
      await donation.save();

      member.membershipType = member.requestedMembershipType;
      member.membershipFee = feeAmount;
      member.requestedMembershipType = null;
      member.upgradePaymentMode = null;
      member.upgradeTransactionId = null;
      member.upgradePaymentReceipt = null;
    }
    await member.save();

    res.json({ success: true, message: 'Membership request approved successfully' });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
};

// POST /api/admin/members/:id/reject-request
export const rejectMembershipRequest = async (req, res) => {
  try {
    const member = await Member.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    member.requestStatus = 'Rejected';
    member.status = 'Inactive';
    member.requestedMembershipType = null;
    await member.save();

    res.json({ success: true, message: 'Membership request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
};
