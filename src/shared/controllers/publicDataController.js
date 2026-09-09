import cache from '../../utils/cache.js';
import Project from '../models/Project.js';
import Donation from '../models/Donation.js';
import Event from '../models/Event.js';
import Campaign from '../models/Campaign.js';
import Volunteer from '../models/Volunteer.js';
import Member from '../models/Member.js';
import Branch from '../models/Branch.js';
import CmsConfig from '../models/CmsConfig.js';
import Course from '../models/Course.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import CourseCertificate from '../models/CourseCertificate.js';
import { sendCourseEnrollmentEmail } from '../services/emailService.js';

export const getPublicProjects = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const projects = await Project.find({ status: { $in: ['Active', 'Completed'] } })
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('getPublicProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public projects' });
  }
};

export const getPublicEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const events = await Event.find({ status: { $in: ['Active', 'Planned', 'Completed'] } })
      .populate('branch', 'name')
      .sort({ startDate: 1 })
      .limit(limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('getPublicEvents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public events' });
  }
};

export const getPublicCampaigns = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const campaigns = await Campaign.find({ status: { $in: ['Active', 'Planned'] } })
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('getPublicCampaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public campaigns' });
  }
};

export const getPublicStats = async (req, res) => {
  try {
    const cached = cache.get('public_stats');
    if (cached) return res.json({ success: true, data: cached });

    const [cms, volunteersCount, membersCount, branchesCount, projectsCount, certificatesCount] = await Promise.all([
      CmsConfig.findOne().lean(),
      Volunteer.countDocuments({ status: 'Active' }),
      Member.countDocuments({ status: 'Active' }),
      Branch.countDocuments({ isActive: true }),
      Project.countDocuments({ status: 'Completed' }),
      CourseCertificate.countDocuments({ status: 'Verified' })
    ]);

    const livesImpacted = cms?.stats?.livesImpacted || 12500;

    const data = {
      livesImpacted,
      volunteersCount: volunteersCount || cms?.stats?.volunteersCount || 0,
      projectsCount: projectsCount || cms?.stats?.projectsCompleted || 0,
      branchesCount: branchesCount || 1,
      membersCount: membersCount || 0,
      certificatesIssued: certificatesCount
    };
    cache.set('public_stats', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('getPublicStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public stats' });
  }
};

export const createPublicDonation = async (req, res) => {
  try {
    const { donorName, donorEmail, donorPhone, amount, paymentMethod, purpose, campaign, branch, notes, transactionId } = req.body;

    if (!donorName || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Donor name, amount, and payment method are required' });
    }

    // Create donation record
    const donation = new Donation({
      donorName,
      donorEmail: donorEmail || null,
      donorPhone: donorPhone || null,
      amount: Number(amount),
      paymentMethod,
      paymentStatus: 'completed', // For public online simulated checkout, mark as completed
      transactionId: transactionId || 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      purpose: purpose || 'General',
      campaign: campaign || null,
      branch: branch || null,
      notes: notes || 'Online Donation',
      createdBy: null
    });

    await donation.save();

    res.status(201).json({
      success: true,
      message: 'Donation successful. Thank you for your support!',
      data: donation
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Public donation creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
};

export const getPublicCourses = async (req, res) => {
  try {
    const { category, mode, level } = req.query;
    const cacheKey = `courses_${category || ''}_${mode || ''}_${level || ''}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const query = { status: { $in: ['Active', 'Upcoming'] } };
    if (category) query.category = category;
    if (mode) query.mode = mode;
    if (level) query.level = level;
    const courses = await Course.find(query)
      .select('title description category instructor duration totalLessons mode language thumbnailUrl introVideoUrl totalSeats enrolledCount eligibility ageMin ageMax startDate endDate level status syllabus')
      .sort({ createdAt: -1 })
      .lean();
    cache.set(cacheKey, courses);
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};

export const getPublicCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `course_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const course = await Course.findById(id).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    cache.set(cacheKey, course);
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch course details' });
  }
};

export const submitCourseEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentName, email, phone, whatsapp, age, education, city, state, whyCourse } = req.body;

    if (!studentName || !email || !phone || !city) {
      return res.status(400).json({ success: false, message: 'Name, email, phone and city are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.status !== 'Active' && course.status !== 'Upcoming') {
      return res.status(400).json({ success: false, message: 'Enrollments are not open for this course' });
    }

    const existing = await CourseEnrollment.findOne({ course: courseId, email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'You have already applied for this course' });

    const enrollment = new CourseEnrollment({
      course: courseId,
      courseTitle: course.title,
      studentName, email, phone,
      whatsapp: whatsapp || phone,
      age: Number(age) || 18,
      education: education || '12th Pass',
      city, state: state || 'Uttar Pradesh',
      whyCourse: whyCourse || '',
      status: 'Pending',
    });

    await enrollment.save();

    // Send confirmation email asynchronously (non-blocking)
    try {
      sendCourseEnrollmentEmail(enrollment);
    } catch (emailErr) {
      console.error('Failed to trigger application confirmation email:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We will contact you soon.',
      data: { enrollmentId: enrollment.enrollmentId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

