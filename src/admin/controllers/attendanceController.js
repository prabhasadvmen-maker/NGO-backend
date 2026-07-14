import Attendance from '../../shared/models/Attendance.js';
import Volunteer from '../../shared/models/Volunteer.js';
import Branch from '../../shared/models/Branch.js';
import { getViewPresignedUrl } from '../../utils/r2.js';

// Normalize date to UTC Midnight (00:00:00.000) for consistent indexing
const getStartOfDay = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// GET /api/admin/volunteers/attendance/sheet
// Get all active volunteers in a branch with their marked attendance on a specific date
export const getAttendanceSheet = async (req, res) => {
  try {
    const { branch, date } = req.query;

    if (!branch) {
      return res.status(400).json({ success: false, message: 'Branch ID is required' });
    }

    const targetDate = getStartOfDay(date);

    // 1. Fetch all active volunteers registered by this admin in this branch
    const volunteers = await Volunteer.find({
      branch,
      status: 'Active',
      createdBy: req.user.id
    })
      .select('fullName volunteerId mobileNumber profilePhoto')
      .lean();

    // Attach presigned view URLs for profile photos
    const volunteersWithUrls = await Promise.all(
      volunteers.map(async (v) => ({
        ...v,
        photoUrl: v.profilePhoto ? await getViewPresignedUrl(v.profilePhoto) : null,
      }))
    );

    // 2. Fetch any marked attendance records on that date
    const attendanceRecords = await Attendance.find({
      branch,
      date: targetDate,
      createdBy: req.user.id
    }).lean();

    // Create a lookup map of volunteerId -> attendance record
    const attendanceMap = new Map(
      attendanceRecords.map(r => [r.volunteer.toString(), r])
    );

    // 3. Merge attendance state into the volunteer records
    const sheet = volunteersWithUrls.map(v => {
      const record = attendanceMap.get(v._id.toString());
      return {
        ...v,
        attendance: record ? {
          status: record.status,
          remarks: record.remarks,
          marked: true,
          recordId: record._id
        } : {
          status: 'Present', // Default selection
          remarks: '',
          marked: false,
          recordId: null
        }
      };
    });

    res.json({
      success: true,
      date: targetDate,
      data: sheet
    });
  } catch (error) {
    console.error('Get attendance sheet error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance sheet' });
  }
};

// POST /api/admin/volunteers/attendance/save
// Save/Update attendance records in bulk
export const saveAttendance = async (req, res) => {
  try {
    const { branch, date, records } = req.body;

    if (!branch || !date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Branch, Date, and Attendance records are required' });
    }

    // Verify branch exists
    const branchExists = await Branch.findById(branch);
    if (!branchExists) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const targetDate = getStartOfDay(date);

    // Prepare bulk operations for atomic save & upsert update
    const bulkOps = records.map(rec => {
      const { volunteerId, status, remarks = '' } = rec;
      return {
        updateOne: {
          filter: { volunteer: volunteerId, date: targetDate, createdBy: req.user.id },
          update: { 
            $set: { 
              status, 
              remarks, 
              branch,
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      message: 'Attendance saved successfully'
    });
  } catch (error) {
    console.error('Save attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit attendance logs' });
  }
};

// GET /api/admin/volunteers/attendance/history
// Fetch logs with search & date filters
export const getAttendanceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', branch = '', startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { createdBy: req.user.id };

    if (branch) filter.branch = branch;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = getStartOfDay(startDate);
      if (endDate) filter.date.$lte = getStartOfDay(endDate);
    }

    // If search filter is active, fetch matching volunteer IDs first
    if (search) {
      const matchingVolunteers = await Volunteer.find({
        fullName: { $regex: search, $options: 'i' },
        createdBy: req.user.id
      }).select('_id');
      
      const volunteerIds = matchingVolunteers.map(v => v._id);
      filter.volunteer = { $in: volunteerIds };
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('volunteer', 'fullName volunteerId mobileNumber profilePhoto')
        .populate('branch', 'name code')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(filter)
    ]);

    // Attach presigned view URLs for profile photos
    const recordsWithUrls = await Promise.all(
      records.map(async (r) => {
        if (r.volunteer) {
          return {
            ...r,
            volunteer: {
              ...r.volunteer,
              photoUrl: r.volunteer.profilePhoto ? await getViewPresignedUrl(r.volunteer.profilePhoto) : null
            }
          };
        }
        return r;
      })
    );

    res.json({
      success: true,
      data: recordsWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance logs' });
  }
};
