import { v4 as uuidv4 } from 'uuid';
import Volunteer from '../../shared/models/Volunteer.js';
import Branch from '../../shared/models/Branch.js';
import { getViewPresignedUrl, deleteObject, getUploadPresignedUrl } from '../../utils/r2.js';

// GET /api/superadmin/volunteers/upload-url
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
    const key = `volunteers/photos/${uuidv4()}.${ext}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);
    res.json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Volunteer upload URL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// Sanitize body values to null for empty optional fields
function sanitizeBody(body) {
  const optionalFields = [
    'email', 'gender', 'pinCode', 'dateOfBirth', 
    'address', 'city', 'district', 'state', 'availability', 'profilePhoto'
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

// GET /api/superadmin/volunteers
export const getVolunteers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', availability = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (availability) filter.availability = availability;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { volunteerId: { $regex: search, $options: 'i' } },
      ];
    }

    const [volunteers, total] = await Promise.all([
      Volunteer.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Volunteer.countDocuments(filter),
    ]);

    // Attach presigned view URLs for profile photos
    const volunteersWithUrls = await Promise.all(
      volunteers.map(async (v) => ({
        ...v,
        photoUrl: v.profilePhoto ? await getViewPresignedUrl(v.profilePhoto) : null,
      }))
    );

    res.json({
      success: true,
      data: volunteersWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get volunteers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch volunteers' });
  }
};

// GET /api/superadmin/volunteers/stats
export const getVolunteerStats = async (req, res) => {
  try {
    const totalVolunteers = await Volunteer.countDocuments();
    const activeVolunteers = await Volunteer.countDocuments({ status: 'Active' });
    const pendingVolunteers = await Volunteer.countDocuments({ status: 'Pending' });
    const inactiveVolunteers = await Volunteer.countDocuments({ status: 'Inactive' });

    // Aggregate key skills represented in DB
    const skillsAggregation = await Volunteer.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const skillsBreakdown = skillsAggregation.map(s => ({ name: s._id, count: s.count }));

    res.json({
      success: true,
      data: {
        totalVolunteers,
        activeVolunteers,
        pendingVolunteers,
        inactiveVolunteers,
        skillsBreakdown,
      },
    });
  } catch (error) {
    console.error('Superadmin get volunteer stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch volunteer statistics' });
  }
};

// GET /api/superadmin/volunteers/:id
export const getVolunteerById = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id)
      .populate('branch', 'name code city state')
      .populate('createdBy', 'name email role')
      .lean();

    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    const photoUrl = volunteer.profilePhoto ? await getViewPresignedUrl(volunteer.profilePhoto) : null;

    res.json({
      success: true,
      data: {
        ...volunteer,
        photoUrl,
      },
    });
  } catch (error) {
    console.error('Superadmin get volunteer by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch volunteer details' });
  }
};

// POST /api/superadmin/volunteers
export const createVolunteer = async (req, res) => {
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
    const volunteer = new Volunteer({
      ...sanitized,
      createdBy: req.user.id
    });

    await volunteer.save();

    res.status(201).json({
      success: true,
      message: 'Volunteer registered successfully',
      data: volunteer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Volunteer with this mobile number or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Superadmin create volunteer error:', error);
    res.status(500).json({ success: false, message: 'Failed to register volunteer' });
  }
};

// PUT /api/superadmin/volunteers/:id
export const updateVolunteer = async (req, res) => {
  try {
    const { branch } = req.body;

    // Verify branch if changed
    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ success: false, message: 'Assigned branch does not exist' });
      }
    }

    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    const sanitized = sanitizeBody(req.body);

    // Clean up old photo if updated/removed
    if (sanitized.profilePhoto && sanitized.profilePhoto !== volunteer.profilePhoto && volunteer.profilePhoto) {
      await deleteObject(volunteer.profilePhoto).catch(() => {});
    }

    Object.assign(volunteer, sanitized);
    await volunteer.save();

    const photoUrl = volunteer.profilePhoto ? await getViewPresignedUrl(volunteer.profilePhoto) : null;

    res.json({
      success: true,
      message: 'Volunteer updated successfully',
      data: {
        ...volunteer.toObject(),
        photoUrl,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Volunteer with this mobile number or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Superadmin update volunteer error:', error);
    res.status(500).json({ success: false, message: 'Failed to update volunteer' });
  }
};

// DELETE /api/superadmin/volunteers/:id
export const deleteVolunteer = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndDelete(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    if (volunteer.profilePhoto) {
      await deleteObject(volunteer.profilePhoto).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Volunteer deleted successfully',
    });
  } catch (error) {
    console.error('Superadmin delete volunteer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete volunteer' });
  }
};

// PATCH /api/superadmin/volunteers/:id/toggle-status
export const toggleVolunteerStatus = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    // Toggle between Active and Inactive
    volunteer.status = volunteer.status === 'Active' ? 'Inactive' : 'Active';
    await volunteer.save();

    res.json({
      success: true,
      message: `Volunteer status updated to ${volunteer.status}`,
      data: { status: volunteer.status },
    });
  } catch (error) {
    console.error('Superadmin toggle status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update volunteer status' });
  }
};
