import jwt from 'jsonwebtoken';
import Volunteer from '../../shared/models/Volunteer.js';
import Branch from '../../shared/models/Branch.js';
import { uploadToR2 } from '../../shared/utils/r2Upload.js';
import { getViewPresignedUrl } from '../../utils/r2.js';
import { sendVolunteerRegistrationEmail, sendAdminNewVolunteerNotification } from '../../shared/services/emailService.js';

/**
 * Volunteer Signup (Self-Registration) with Photo Upload
 * POST /api/volunteer/auth/signup
 */
export const volunteerSignup = async (req, res) => {
  try {
    const { fullName, mobileNumber, email, password, dateOfBirth, gender, branch, availability, skills, address, city, state, pinCode } = req.body;

    // Validation
    if (!fullName || !mobileNumber || !password || !branch) {
      return res.status(400).json({
        success: false,
        message: 'Full name, mobile number, password, and branch are required',
      });
    }

    // Check if mobile already exists
    const existingVolunteer = await Volunteer.findOne({ mobileNumber });
    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered',
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Volunteer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }
    }

    // Verify branch exists
    const branchExists = await Branch.findById(branch);
    if (!branchExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch selected',
      });
    }

    // Upload profile photo to R2 if provided
    let profilePhotoKey = null;
    if (req.file) {
      try {
        const fileName = `volunteers/${Date.now()}-${mobileNumber}-${req.file.originalname}`;
        profilePhotoKey = await uploadToR2(req.file.buffer, fileName, req.file.mimetype);
      } catch (uploadError) {
        console.error('Photo upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload profile photo. Please try again.',
        });
      }
    }

    // Create new volunteer (self-registered)
    const newVolunteer = new Volunteer({
      fullName,
      mobileNumber,
      email: email || null,
      password: password || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      branch,
      availability: availability || 'Part-time',
      skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      address: address || null,
      city: city || null,
      state: state || null,
      pinCode: pinCode || null,
      profilePhoto: profilePhotoKey,
      status: 'Pending', // New volunteers start as Pending
      registrationType: 'self-registered',
      createdBy: null, // Self-registered, no admin
    });

    await newVolunteer.save();

    // Send emails
    const populatedVolunteer = await Volunteer.findById(newVolunteer._id).populate('branch');
    await sendVolunteerRegistrationEmail(populatedVolunteer);
    await sendAdminNewVolunteerNotification(populatedVolunteer, process.env.SUPER_ADMIN_EMAIL);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newVolunteer._id,
        volunteerId: newVolunteer.volunteerId,
        name: newVolunteer.fullName,
        email: newVolunteer.email,
        mobileNumber: newVolunteer.mobileNumber,
        role: 'volunteer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Volunteer registration successful! Your account is pending admin approval. You will receive an email once approved.',
      token,
      user: {
        id: newVolunteer._id,
        volunteerId: newVolunteer.volunteerId,
        name: newVolunteer.fullName,
        email: newVolunteer.email,
        mobileNumber: newVolunteer.mobileNumber,
        city: newVolunteer.city,
        status: newVolunteer.status,
        profilePhoto: profilePhotoKey,
        profilePhotoUrl: profilePhotoKey ? await getViewPresignedUrl(profilePhotoKey) : null,
      },
    });
  } catch (error) {
    console.error('Error in volunteer signup:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ') || error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number or email already registered',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Signup failed: ' + error.message,
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Volunteer Login with Email & Password
 * POST /api/volunteer/auth/login
 */
export const volunteerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find volunteer by email
    const volunteer = await Volunteer.findOne({ email }).populate('branch', 'name code city');

    if (!volunteer) {
      return res.status(200).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Password check
    const storedPassword = volunteer.password;
    const expectedPassword = storedPassword || (volunteer.mobileNumber.slice(-4) + 'Savitram');
    
    if (password !== expectedPassword) {
      return res.status(200).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if volunteer is active
    if (volunteer.status !== 'Active') {
      let message = `Your volunteer account is ${volunteer.status.toLowerCase()}. Please contact admin.`;
      if (volunteer.status === 'Pending') {
        message = 'Your account is under review. Please wait for admin approval.';
      } else if (volunteer.status === 'Inactive') {
        message = 'Your account has been deactivated. Please contact your branch admin.';
      }
      return res.status(200).json({
        success: false,
        message,
      });
    }

    // Update login tracking
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'Unknown';
    volunteer.lastLogin = new Date();
    volunteer.lastLoginIP = clientIP;
    volunteer.loginCount = (volunteer.loginCount || 0) + 1;
    await volunteer.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: volunteer._id,
        volunteerId: volunteer.volunteerId,
        name: volunteer.fullName,
        email: volunteer.email,
        mobileNumber: volunteer.mobileNumber,
        role: 'volunteer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: volunteer._id,
        volunteerId: volunteer.volunteerId,
        name: volunteer.fullName,
        email: volunteer.email,
        mobileNumber: volunteer.mobileNumber,
        city: volunteer.city,
        branch: volunteer.branch,
        profilePhoto: volunteer.profilePhoto,
        profilePhotoUrl: volunteer.profilePhoto ? await getViewPresignedUrl(volunteer.profilePhoto) : null,
      },
    });
  } catch (error) {
    console.error('Error in volunteer login:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * Get Current Volunteer Profile
 * GET /api/volunteer/auth/me
 */
export const getVolunteerProfile = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.user.id)
      .populate('branch', 'name code city')
      .select('-__v');

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: volunteer._id,
        volunteerId: volunteer.volunteerId,
        name: volunteer.fullName,
        email: volunteer.email,
        mobileNumber: volunteer.mobileNumber,
        city: volunteer.city,
        state: volunteer.state,
        branch: volunteer.branch,
        profilePhoto: volunteer.profilePhoto,
        profilePhotoUrl: volunteer.profilePhoto ? await getViewPresignedUrl(volunteer.profilePhoto) : null,
        status: volunteer.status,
        availability: volunteer.availability,
        skills: volunteer.skills,
        joinedDate: volunteer.joinedDate,
        lastLogin: volunteer.lastLogin,
        loginCount: volunteer.loginCount,
      },
    });
  } catch (error) {
    console.error('Error fetching volunteer profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};
