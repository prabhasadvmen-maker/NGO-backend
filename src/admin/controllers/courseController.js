import Course from '../../shared/models/Course.js';
import CourseEnrollment from '../../shared/models/CourseEnrollment.js';
import CourseCertificate from '../../shared/models/CourseCertificate.js';
import { sendCourseEnrollmentApprovalEmail, sendCourseEnrollmentRejectionEmail } from '../../shared/services/emailService.js';

// ==================== COURSES ====================

export const getAllCourses = async (req, res) => {
  try {
    const { search, category, level, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (level) query.level = level;
    if (status && status !== 'All') query.status = status;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

    // Calculate dynamic stats
    const allCoursesList = await Course.find();
    const totalCourses = allCoursesList.length;
    const activeBatches = allCoursesList.filter(c => c.status === 'Active').length;
    const totalEnrolledStudents = allCoursesList.reduce((acc, c) => acc + (c.enrolledCount || 0), 0);
    const completedPrograms = allCoursesList.filter(c => c.status === 'Completed').length;

    res.json({
      success: true,
      data: courses,
      stats: {
        totalCourses,
        activeBatches,
        totalEnrolledStudents,
        completedPrograms,
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      createdBy: req.user?._id || req.user?.id,
    };
    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update course' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, message: 'Failed to delete course' });
  }
};

export const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.json({
      success: true,
      message: `Course status changed to ${course.isActive ? 'Active' : 'Inactive'}`,
      data: course,
    });
  } catch (error) {
    console.error('Error toggling course status:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle course status' });
  }
};

// ==================== ENROLLMENTS ====================

export const getAllEnrollments = async (req, res) => {
  try {
    const { status, courseId, search, city } = req.query;
    const query = {};

    if (status && status !== 'All') query.status = status;
    if (courseId) query.course = courseId;
    if (city) query.city = { $regex: city, $options: 'i' };

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { enrollmentId: { $regex: search, $options: 'i' } },
        { courseTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const enrollments = await CourseEnrollment.find(query)
      .populate('course', 'title category level duration mode')
      .sort({ createdAt: -1 });

    const allEnrollments = await CourseEnrollment.find();
    const stats = {
      totalApplications: allEnrollments.length,
      pendingCount: allEnrollments.filter(e => e.status === 'Pending').length,
      approvedCount: allEnrollments.filter(e => e.status === 'Approved').length,
      completedCount: allEnrollments.filter(e => e.status === 'Completed').length,
      rejectedCount: allEnrollments.filter(e => e.status === 'Rejected').length,
    };

    res.json({
      success: true,
      data: enrollments,
      stats,
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ success: false, message: 'Server error fetching enrollments' });
  }
};

export const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const enrollment = await CourseEnrollment.findById(id);

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment application not found' });
    }

    enrollment.status = 'Approved';
    await enrollment.save();

    // Increment enrolledCount on Course if course exists
    if (enrollment.course) {
      await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });
    }

    // Send approval notification email (non-blocking)
    try {
      sendCourseEnrollmentApprovalEmail(enrollment);
    } catch (emailErr) {
      console.error('Failed to trigger approval email:', emailErr);
    }

    res.json({
      success: true,
      message: 'Enrollment application approved successfully',
      data: enrollment,
    });
  } catch (error) {
    console.error('Error approving enrollment:', error);
    res.status(500).json({ success: false, message: 'Failed to approve enrollment' });
  }
};

export const rejectEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const enrollment = await CourseEnrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment application not found' });
    }

    enrollment.status = 'Rejected';
    enrollment.rejectionReason = rejectionReason || 'Criteria not met';
    await enrollment.save();

    // Send rejection notification email (non-blocking)
    try {
      sendCourseEnrollmentRejectionEmail(enrollment, enrollment.rejectionReason);
    } catch (emailErr) {
      console.error('Failed to trigger rejection email:', emailErr);
    }

    res.json({
      success: true,
      message: 'Enrollment application rejected',
      data: enrollment,
    });
  } catch (error) {
    console.error('Error rejecting enrollment:', error);
    res.status(500).json({ success: false, message: 'Failed to reject enrollment' });
  }
};

export const completeEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const enrollment = await CourseEnrollment.findById(id).populate('course');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment application not found' });
    }

    enrollment.status = 'Completed';

    // Auto-generate certificate
    const courseTitle = enrollment.course?.title || enrollment.courseTitle || 'Skill Certificate Program';
    const category = enrollment.course?.category || 'Vocational Training';
    const duration = enrollment.course?.duration || '3 Months';
    const instructorName = enrollment.course?.instructor || 'Savitram Foundation Faculty';

    const cert = new CourseCertificate({
      enrollment: enrollment._id,
      studentName: enrollment.studentName,
      courseName: courseTitle,
      category,
      duration,
      completionDate: new Date(),
      grade: 'A+',
      status: 'Verified',
      instructorName,
    });

    await cert.save();

    enrollment.certificateId = cert.certificateId;
    await enrollment.save();

    res.json({
      success: true,
      message: `Course marked complete! Certificate auto-generated: ${cert.certificateId}`,
      certificateId: cert.certificateId,
      data: enrollment,
      certificate: cert,
    });
  } catch (error) {
    console.error('Error marking enrollment complete:', error);
    res.status(500).json({ success: false, message: 'Failed to complete enrollment & generate certificate' });
  }
};

export const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const enrollment = await CourseEnrollment.findByIdAndDelete(id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment application not found' });
    }
    res.json({
      success: true,
      message: 'Enrollment application deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ success: false, message: 'Failed to delete enrollment application' });
  }
};

// ==================== CERTIFICATES ====================

export const getAllCertificates = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { certificateId: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } },
        { courseName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const certificates = await CourseCertificate.find(query).sort({ createdAt: -1 });

    const allCerts = await CourseCertificate.find();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalCertificates: allCerts.length,
      validCount: allCerts.filter(c => c.status === 'Verified').length,
      revokedCount: allCerts.filter(c => c.status === 'Revoked').length,
      issuedThisMonth: allCerts.filter(c => new Date(c.createdAt) >= startOfMonth).length,
    };

    res.json({
      success: true,
      data: certificates,
      stats,
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ success: false, message: 'Server error fetching certificates' });
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { revokedReason } = req.body;

    const certificate = await CourseCertificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    certificate.status = 'Revoked';
    certificate.revokedReason = revokedReason || 'Revoked by administrator';
    await certificate.save();

    res.json({
      success: true,
      message: `Certificate ${certificate.certificateId} has been revoked`,
      data: certificate,
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke certificate' });
  }
};
