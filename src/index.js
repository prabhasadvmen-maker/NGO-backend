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
import User from './shared/models/User.js';
import Event from './shared/models/Event.js';
import NgoProfile from './shared/models/NgoProfile.js';

dotenv.config();
validateEnv();

const app = express();
app.set('trust proxy', 1); // Trust reverse proxy
const PORT = process.env.PORT || 5000;

app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://savitramfoundation.org',
      'https://www.savitramfoundation.org',
      'https://savitramfoundation.com',
      'https://www.savitramfoundation.com',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
          startDate: new Date(Date.now() + 3600000 * 24 * 7), // 7 days from now
          endDate: new Date(Date.now() + 3600000 * 24 * 7 + 3600000 * 6), // + 6 hours
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
          startDate: new Date(Date.now() + 3600000 * 24 * 14), // 14 days from now
          endDate: new Date(Date.now() + 3600000 * 24 * 14 + 3600000 * 4), // + 4 hours
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
          startDate: new Date(Date.now() + 3600000 * 24 * 3), // 3 days from now
          endDate: new Date(Date.now() + 3600000 * 24 * 3 + 3600000 * 8), // + 8 hours
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
        email: 'info@savitramfoundation.org',
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
app.use('/api/public', publicRoutes);
app.use('/api/superadmin/expenses', superadminExpenseRoutes);
app.use('/api/admin/expenses', adminExpenseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/superadmin/cms', superadminCmsRoutes);
app.use('/api/admin/cms', adminCmsRoutes);
app.use('/api/public/cms', publicCmsRoutes);
app.use('/api/public', publicDataRoutes);
app.use('/api/superadmin/media', superadminMediaRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/superadmin/communication', superadminCommunicationRoutes);
app.use('/api/admin/communication', adminCommunicationRoutes);
app.use('/api/superadmin/system', systemRoutes);
app.use('/api/member/auth', memberAuthRoutes);
app.use('/api/member/membership', memberMembershipRoutes);
app.use('/api/member/activities', memberActivityRoutes);

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
