import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Member from '../../shared/models/Member.js';
import { getUploadPresignedUrl, getViewPresignedUrl } from '../../utils/r2.js';

// GET /api/member/auth/upload-url?fileName=x&contentType=image/jpeg (Public)
export const getMemberUploadUrl = async (req, res) => {
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
    const key = `members/photos/${uuidv4()}.${ext}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);
    res.json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Member upload URL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// POST /api/member/auth/register (Public)
export const memberRegister = async (req, res) => {
  try {
    const {
      fullName, mobileNumber, email, password, dateOfBirth, gender,
      address, state, district, pinCode, occupation, profilePhoto, referredBy
    } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({ success: false, message: 'Full name and mobile number are required' });
    }

    // Check if email already registered as member
    if (email) {
      const existing = await Member.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email address is already registered' });
      }
    }

    // Check if mobile already registered
    const existingMobile = await Member.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered' });
    }

    // Create member (defaults status: Pending, createdBy: will be self or superadmin; let's set createdBy to a placeholder or self-created)
    // Wait, createdBy is a required Schema field referencing 'User' (Admin). If a member registers themselves, they don't have an admin creator.
    // Let's check Member.js model:
    // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    // Wait! If createdBy is required, and member registers themselves, what should createdBy be?
    // Let's set it to the Super Admin's ID!
    // Let's find the super_admin user in the DB.
    let creatorId = req.body.createdBy;
    if (!creatorId) {
      const superAdmin = await Member.model('User').findOne({ role: 'super_admin' });
      if (superAdmin) {
        creatorId = superAdmin._id;
      } else {
        return res.status(500).json({ success: false, message: 'System error: Creator entity not found' });
      }
    }

    const member = new Member({
      fullName,
      mobileNumber,
      email: email ? email.toLowerCase() : null,
      password,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      address: address || null,
      state: state || null,
      district: district || null,
      pinCode: pinCode || null,
      occupation: occupation || null,
      profilePhoto: profilePhoto || null,
      referredBy: referredBy || null,
      status: 'Pending', // Self-registered starts as Pending
      createdBy: creatorId
    });

    await member.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your profile status is Pending admin approval.',
      data: { id: member._id, memberId: member.memberId, fullName: member.fullName }
    });
  } catch (error) {
    console.error('Member registration error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// POST /api/member/auth/login (Public)
export const memberLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const member = await Member.findOne({ email: email.toLowerCase() }).select('+password');
    if (!member) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (!member.password) {
      return res.status(400).json({ success: false, message: 'Login credentials not configured for this account' });
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (member.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Your account status is ${member.status}. Please contact an administrator.`
      });
    }

    // Sign Token
    const token = jwt.sign(
      { id: member._id, email: member.email, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Resolve photo view URL if set
    let photoUrl = null;
    if (member.profilePhoto) {
      photoUrl = await getViewPresignedUrl(member.profilePhoto);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: member._id,
        memberId: member.memberId,
        name: member.fullName,
        email: member.email,
        role: 'member',
        photoUrl
      }
    });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/member/me (Protected: Member role)
export const memberGetMe = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    let photoUrl = null;
    if (member.profilePhoto) {
      photoUrl = await getViewPresignedUrl(member.profilePhoto);
    }

    res.status(200).json({
      success: true,
      data: {
        id: member._id,
        memberId: member.memberId,
        name: member.fullName,
        fullName: member.fullName,
        email: member.email,
        mobileNumber: member.mobileNumber,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        address: member.address,
        state: member.state,
        district: member.district,
        pinCode: member.pinCode,
        occupation: member.occupation,
        membershipType: member.membershipType,
        membershipFee: member.membershipFee,
        joiningDate: member.joiningDate,
        expiryDate: member.expiryDate,
        referredBy: member.referredBy,
        status: member.status,
        photoUrl,
        role: 'member'
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/member/auth/me (Protected: Member role)
export const memberUpdateProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const allowedFields = [
      'fullName', 'mobileNumber', 'dateOfBirth', 'gender',
      'address', 'state', 'district', 'pinCode', 'occupation'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        member[field] = req.body[field];
      }
    });

    await member.save();

    let photoUrl = null;
    if (member.profilePhoto) {
      photoUrl = await getViewPresignedUrl(member.profilePhoto);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: member._id,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        mobileNumber: member.mobileNumber,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        address: member.address,
        state: member.state,
        district: member.district,
        pinCode: member.pinCode,
        occupation: member.occupation,
        membershipType: member.membershipType,
        membershipFee: member.membershipFee,
        joiningDate: member.joiningDate,
        expiryDate: member.expiryDate,
        referredBy: member.referredBy,
        status: member.status,
        photoUrl,
        role: 'member'
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
