import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './shared/config/database.js';
import { validateEnv } from './shared/config/validation.js';
import { ensureR2Cors } from './utils/r2.js';
import authRoutes from './superadmin/routes/authRoutes.js';
import adminAuthRoutes from './admin/routes/authRoutes.js';
import adminRoutes from './superadmin/routes/adminRoutes.js';
import membershipTypeRoutes from './superadmin/routes/membershipTypeRoutes.js';
import ngoProfileRoutes from './superadmin/routes/ngoProfileRoutes.js';
import branchRoutes from './superadmin/routes/branchRoutes.js';
import departmentRoutes from './superadmin/routes/departmentRoutes.js';
import adminDashboardRoutes from './admin/routes/dashboardRoutes.js';
import memberRoutes from './admin/routes/memberRoutes.js';
import memberAuthRoutes from './member/routes/authRoutes.js';
import memberMembershipRoutes from './member/routes/membershipRoutes.js';
import memberActivityRoutes from './member/routes/activityRoutes.js';
import superadminMemberRoutes from './superadmin/routes/memberRoutes.js';
import superadminVolunteerRoutes from './superadmin/routes/volunteerRoutes.js';
import adminVolunteerRoutes from './admin/routes/volunteerRoutes.js';
import adminAttendanceRoutes from './admin/routes/attendanceRoutes.js';
import superadminBeneficiaryRoutes from './superadmin/routes/beneficiaryRoutes.js';
import adminBeneficiaryRoutes from './admin/routes/beneficiaryRoutes.js';
import superadminDonationRoutes from './superadmin/routes/donationRoutes.js';
import adminDonationRoutes from './admin/routes/donationRoutes.js';
import superadminProjectRoutes from './superadmin/routes/projectRoutes.js';
import adminProjectRoutes from './admin/routes/projectRoutes.js';
import superadminEventRoutes from './superadmin/routes/eventRoutes.js';
import adminEventRoutes from './admin/routes/eventRoutes.js';
import superadminCampaignRoutes from './superadmin/routes/campaignRoutes.js';
import adminCampaignRoutes from './admin/routes/campaignRoutes.js';
import superadminCertificateRoutes from './superadmin/routes/certificateRoutes.js';
import adminCertificateRoutes from './admin/routes/certificateRoutes.js';
import publicRoutes from './shared/routes/publicRoutes.js';
import superadminExpenseRoutes from './superadmin/routes/expenseRoutes.js';
import adminExpenseRoutes from './admin/routes/expenseRoutes.js';
import reportsRoutes from './shared/routes/reportsRoutes.js';
import superadminCmsRoutes from './superadmin/routes/cmsRoutes.js';
import adminCmsRoutes from './admin/routes/cmsRoutes.js';
import publicCmsRoutes from './shared/routes/publicCmsRoutes.js';
import publicDataRoutes from './shared/routes/publicDataRoutes.js';
import superadminMediaRoutes from './superadmin/routes/mediaRoutes.js';
import adminMediaRoutes from './admin/routes/mediaRoutes.js';
import superadminCommunicationRoutes from './superadmin/routes/communicationRoutes.js';
import adminCommunicationRoutes from './admin/routes/communicationRoutes.js';
import systemRoutes from './superadmin/routes/systemRoutes.js';
import publicFoodDonationRoutes from './shared/routes/publicFoodDonationRoutes.js';
import adminFoodDonationRoutes from './admin/routes/foodDonationRoutes.js';
import volunteerFoodDonationRoutes from './volunteer/routes/foodDonationRoutes.js';
import volunteerAuthRoutes from './volunteer/routes/authRoutes.js';
import superadminFoodDonationRoutes from './superadmin/routes/foodDonationRoutes.js';
import locationRoutes from './shared/routes/locationRoutes.js';
import adminCourseRoutes from './admin/routes/courseRoutes.js';
import paymentRoutes from './shared/routes/paymentRoutes.js';
import manualTaskRoutes from './admin/routes/manualTaskRoutes.js';
import volunteerAssignmentRoutes from './admin/routes/volunteerAssignmentRoutes.js';
import User from './shared/models/User.js';
import Event from './shared/models/Event.js';
import NgoProfile from './shared/models/NgoProfile.js';
import Course from './shared/models/Course.js';
import CourseEnrollment from './shared/models/CourseEnrollment.js';
import CourseCertificate from './shared/models/CourseCertificate.js';

dotenv.config();
validateEnv();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://savitramfoundation.org', 'https://www.savitramfoundation.org', 'https://savitramfoundation.com', 'https://www.savitramfoundation.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  permittedCrossDomainPolicies: false,
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://savitramfoundation.org',
      'https://www.savitramfoundation.org',
      'https://savitramfoundation.com',
      'https://www.savitramfoundation.com',
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [])
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-rtb-fingerprint-id', 'request-id'],
  exposedHeaders: ['x-rtb-fingerprint-id', 'request-id', 'Content-Type'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(morgan('combined'));

const isDev = process.env.NODE_ENV === 'development';
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDev ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

const initializeSuperAdmin = async () => {
  try {
    const superAdminExists = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
    if (!superAdminExists) {
      const superAdmin = new User({
        name: 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: 'super_admin',
        isActive: true,
      });
      await superAdmin.save();
      console.log('✅ Super Admin created successfully');
      console.log(`📧 Email: ${process.env.SUPER_ADMIN_EMAIL}`);
    } else {
      superAdminExists.password = process.env.SUPER_ADMIN_PASSWORD;
      await superAdminExists.save();
      console.log('✅ Super Admin already exists (password updated/synced with env)');
    }
  } catch (error) {
    console.error('❌ Error initializing super admin:', error.message);
  }
};

const initializeEvents = async () => {
  try {
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      console.log('🌱 Seeding real database events...');
      const superAdmin = await User.findOne({ role: 'super_admin' });
      if (!superAdmin) {
        console.warn('⚠️ Super Admin not found, cannot seed events.');
        return;
      }
      
      const realEvents = [
        {
          title: 'Savitram Free Health Checkup Drive',
          description: 'A comprehensive free health diagnosis camp, specialist consultation, and essential medicine distribution drive for underserved communities.',
          startDate: new Date(Date.now() + 3600000 * 24 * 7),
          endDate: new Date(Date.now() + 3600000 * 24 * 7 + 3600000 * 6),
          location: 'Community Center, Sector 8, Lucknow, UP',
          type: 'Offline',
          capacity: 300,
          registrationsCount: 52,
          status: 'Planned',
          createdBy: superAdmin._id
        },
        {
          title: 'Rural Girl Education & Scholarship Orientation',
          description: 'Interactive session to enroll candidates and distribute learning kits for our annual secondary education scholarship campaign.',
          startDate: new Date(Date.now() + 3600000 * 24 * 14),
          endDate: new Date(Date.now() + 3600000 * 24 * 14 + 3600000 * 4),
          location: 'Savitram Skill Hub, Delhi Okhla Center',
          type: 'Offline',
          capacity: 120,
          registrationsCount: 88,
          status: 'Planned',
          createdBy: superAdmin._id
        },
        {
          title: 'Village Clean Water Infrastructure Inspection',
          description: 'An audit campaign and training workshop for local youth on testing ground water quality and maintaining solar water filtration plants.',
          startDate: new Date(Date.now() + 3600000 * 24 * 3),
          endDate: new Date(Date.now() + 3600000 * 24 * 3 + 3600000 * 8),
          location: 'Panchayat Bhavan, Malihabad outskirts, UP',
          type: 'Offline',
          capacity: 80,
          registrationsCount: 42,
          status: 'Active',
          createdBy: superAdmin._id
        }
      ];

      await Event.insertMany(realEvents);
      console.log('✅ Real database events seeded successfully!');
    } else {
      console.log('📊 Event database is already populated.');
    }
  } catch (error) {
    console.error('❌ Error seeding database events:', error.message);
  }
};

const initializeNgoProfile = async () => {
  try {
    let profile = await NgoProfile.findOne();
    if (!profile) {
      profile = new NgoProfile({
        name: 'SAVITRAM FOUNDATION',
        contactNumber: '8860036008',
        email: 'Support.savitramfoundation@gmail.com',
        address: 'A-13, GRAPHIX 2 SECTOR 62, UPPER GROUND FLOOR, Noida, Noida, Gautam Buddha Nagar - 201301, Uttar Pradesh',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pinCode: '201301',
      });
      await profile.save();
      console.log('✅ NGO profile initialized');
    } else {
      profile.name = 'SAVITRAM FOUNDATION';
      profile.contactNumber = '8860036008';
      profile.email = 'Support.savitramfoundation@gmail.com';
      profile.address = 'A-13, GRAPHIX 2 SECTOR 62, UPPER GROUND FLOOR, Noida, Noida, Gautam Buddha Nagar - 201301, Uttar Pradesh';
      profile.city = 'Noida';
      profile.state = 'Uttar Pradesh';
      profile.pinCode = '201301';
      await profile.save();
      console.log('✅ NGO profile contact information updated in database');
    }
  } catch (error) {
    console.error('❌ Error initializing/updating NGO profile:', error.message);
  }
};

const initializeCourses = async () => {
  try {
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      console.log('🌱 Seeding Savitram Foundation courses & enrollments...');
      
      const seedCourses = [
        {
          title: 'Basic Computer Literacy & Office Productivity',
          description: 'A hands-on foundational course covering Windows OS, Microsoft Office suite, Internet navigation, and digital communication for job readiness.',
          category: 'Computer Literacy',
          instructor: 'Er. Rajesh Kumar',
          duration: '2 Months',
          totalLessons: 24,
          mode: 'Offline',
          language: 'Hindi',
          totalSeats: 40,
          enrolledCount: 28,
          eligibility: 'Anyone',
          ageMin: 14,
          ageMax: 50,
          startDate: new Date(),
          level: 'Beginner',
          status: 'Active',
          syllabus: ['Module 1: Computer Fundamentals & OS', 'Module 2: MS Word & Excel Essentials', 'Module 3: Internet & Email Security'],
        },
        {
          title: 'AI Tools & Prompt Engineering Workshop',
          description: 'Practical training on leveraging generative AI tools like ChatGPT, Gemini, and Midjourney to enhance workplace productivity.',
          category: 'Artificial Intelligence',
          instructor: 'Dr. Prabhas Singh',
          duration: '1 Month',
          totalLessons: 12,
          mode: 'Hybrid',
          language: 'Hindi + English',
          totalSeats: 50,
          enrolledCount: 35,
          eligibility: '12th Pass',
          ageMin: 16,
          ageMax: 45,
          startDate: new Date(),
          level: 'Intermediate',
          status: 'Active',
          syllabus: ['Module 1: Intro to Generative AI', 'Module 2: Advanced Prompting Techniques', 'Module 3: Content Creation & Automation'],
        },
        {
          title: 'Apparel Tailoring & Craft Entrepreneurship',
          description: 'Vocational training for women empowerment focusing on garment cutting, stitching techniques, quality control, and micro-business management.',
          category: 'Tailoring & Crafts',
          instructor: 'Smt. Sunita Devi',
          duration: '3 Months',
          totalLessons: 36,
          mode: 'Offline',
          language: 'Hindi',
          totalSeats: 30,
          enrolledCount: 22,
          eligibility: 'Anyone',
          ageMin: 18,
          ageMax: 55,
          startDate: new Date(),
          level: 'Beginner',
          status: 'Active',
          syllabus: ['Module 1: Measurement & Pattern Drafting', 'Module 2: Stitching & Machine Maintenance', 'Module 3: Pricing & Local Market Sales'],
        },
        {
          title: 'Spoken English & Corporate Soft Skills',
          description: 'Interactive spoken English development, public speaking confidence, resume building, and interview preparation.',
          category: 'Spoken English',
          instructor: 'Anjali Sharma',
          duration: '3 Months',
          totalLessons: 30,
          mode: 'Online',
          language: 'English',
          totalSeats: 60,
          enrolledCount: 15,
          eligibility: '10th Pass',
          ageMin: 15,
          ageMax: 40,
          startDate: new Date(Date.now() + 86400000 * 10),
          level: 'Beginner',
          status: 'Upcoming',
          syllabus: ['Module 1: Grammar & Vocabulary', 'Module 2: Conversation & Group Discussions', 'Module 3: Interview Mastery'],
        }
      ];

      const insertedCourses = await Course.insertMany(seedCourses);
      console.log('✅ Savitram Foundation courses seeded!');

      // Seed enrollments
      const seedEnrollments = [
        {
          enrollmentId: 'ENR-2025-00001',
          course: insertedCourses[0]._id,
          courseTitle: insertedCourses[0].title,
          studentName: 'Amit Verma',
          email: 'amit.verma@gmail.com',
          phone: '9876543210',
          whatsapp: '9876543210',
          age: 21,
          education: '12th Pass',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          whyCourse: 'I want to learn basic computers to get a data entry job in my city.',
          status: 'Pending',
        },
        {
          enrollmentId: 'ENR-2025-00002',
          course: insertedCourses[1]._id,
          courseTitle: insertedCourses[1].title,
          studentName: 'Priya Sharma',
          email: 'priya.s@gmail.com',
          phone: '9123456789',
          whatsapp: '9123456789',
          age: 23,
          education: 'Graduate',
          city: 'Noida',
          state: 'Uttar Pradesh',
          whyCourse: 'Want to upgrade my digital skills with AI prompt engineering.',
          status: 'Approved',
        },
        {
          enrollmentId: 'ENR-2025-00003',
          course: insertedCourses[2]._id,
          courseTitle: insertedCourses[2].title,
          studentName: 'Suman Gupta',
          email: 'suman.gupta@yahoo.com',
          phone: '9988776655',
          whatsapp: '9988776655',
          age: 32,
          education: '10th Pass',
          city: 'Kanpur',
          state: 'Uttar Pradesh',
          whyCourse: 'Seeking self-employment through tailoring micro-enterprise.',
          status: 'Completed',
          certificateId: 'CERT-2025-00001',
        }
      ];

      const insertedEnrollments = await CourseEnrollment.insertMany(seedEnrollments);

      // Seed Certificate
      const seedCertificate = new CourseCertificate({
        certificateId: 'CERT-2025-00001',
        enrollment: insertedEnrollments[2]._id,
        studentName: 'Suman Gupta',
        courseName: insertedCourses[2].title,
        category: insertedCourses[2].category,
        duration: insertedCourses[2].duration,
        completionDate: new Date(),
        grade: 'A+',
        status: 'Verified',
        instructorName: insertedCourses[2].instructor,
      });

      await seedCertificate.save();
      console.log('✅ Savitram Foundation initial enrollments & certificates seeded!');
    }
  } catch (error) {
    console.error('❌ Error seeding courses data:', error.message);
  }
};

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/superadmin/membership-types', membershipTypeRoutes);
app.use('/api/membership-types', membershipTypeRoutes);
app.use('/api/superadmin/ngo-profile', ngoProfileRoutes);
app.use('/api/ngo-profile', ngoProfileRoutes);
app.use('/api/superadmin/branches', branchRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/superadmin/departments', departmentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/members', memberRoutes);
app.use('/api/superadmin/members', superadminMemberRoutes);
app.use('/api/superadmin/volunteers', superadminVolunteerRoutes);
app.use('/api/admin/volunteers', adminVolunteerRoutes);
app.use('/api/admin/volunteers/attendance', adminAttendanceRoutes);
app.use('/api/superadmin/beneficiaries', superadminBeneficiaryRoutes);
app.use('/api/admin/beneficiaries', adminBeneficiaryRoutes);
app.use('/api/superadmin/donations', superadminDonationRoutes);
app.use('/api/admin/donations', adminDonationRoutes);
app.use('/api/superadmin/projects', superadminProjectRoutes);
app.use('/api/admin/projects', adminProjectRoutes);
app.use('/api/superadmin/events', superadminEventRoutes);
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/superadmin/campaigns', superadminCampaignRoutes);
app.use('/api/admin/campaigns', adminCampaignRoutes);
app.use('/api/superadmin/certificates', superadminCertificateRoutes);
app.use('/api/admin/certificates', adminCertificateRoutes);
app.use('/api/public/food-donations', publicFoodDonationRoutes);
app.use('/api/admin/food-donations', adminFoodDonationRoutes);
app.use('/api/volunteer/auth', volunteerAuthRoutes);
app.use('/api/volunteer/food-donations', volunteerFoodDonationRoutes);
app.use('/api/superadmin/food-donations', superadminFoodDonationRoutes);
app.use('/api/public/locations', locationRoutes);
app.use('/api/admin/locations', locationRoutes);
app.use('/api/superadmin/locations', locationRoutes);
app.use('/api/admin/courses', adminCourseRoutes);
app.use('/api/public/cms', publicCmsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/superadmin/expenses', superadminExpenseRoutes);
app.use('/api/admin/expenses', adminExpenseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/superadmin/cms', superadminCmsRoutes);
app.use('/api/admin/cms', adminCmsRoutes);
app.use('/api/public', publicDataRoutes);
app.use('/api/superadmin/media', superadminMediaRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/superadmin/communication', superadminCommunicationRoutes);
app.use('/api/admin/communication', adminCommunicationRoutes);
app.use('/api/superadmin/system', systemRoutes);
app.use('/api/member/auth', memberAuthRoutes);
app.use('/api/member/membership', memberMembershipRoutes);
app.use('/api/member/activities', memberActivityRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', manualTaskRoutes);
app.use('/api/admin', volunteerAssignmentRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await initializeSuperAdmin();
    await initializeEvents();
    await initializeNgoProfile();
    await initializeCourses();
    await ensureR2Cors();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔒 Security: Helmet enabled, Rate limiting active\n`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
