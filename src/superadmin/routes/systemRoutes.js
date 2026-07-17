import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import { logActivity } from '../../utils/auditLogger.js';

// Database Models
import User from '../../shared/models/User.js';
import Branch from '../../shared/models/Branch.js';
import Department from '../../shared/models/Department.js';
import Member from '../../shared/models/Member.js';
import Volunteer from '../../shared/models/Volunteer.js';
import Beneficiary from '../../shared/models/Beneficiary.js';
import Donation from '../../shared/models/Donation.js';
import Expense from '../../shared/models/Expense.js';
import Project from '../../shared/models/Project.js';
import Event from '../../shared/models/Event.js';
import GalleryItem from '../../shared/models/GalleryItem.js';
import NewsPost from '../../shared/models/NewsPost.js';
import SystemConfig from '../../shared/models/SystemConfig.js';
import CmsConfig from '../../shared/models/CmsConfig.js';
import AuditLog from '../../shared/models/AuditLog.js';
import ApiKey from '../../shared/models/ApiKey.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupsDir = path.join(__dirname, '../../../../backups');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// ----------------------------------------------------
// AUDIT LOGS ENDPOINTS
// ----------------------------------------------------

// List audit logs
router.get('/audit-logs', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const moduleFilter = req.query.module || '';

    const query = {};
    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }
    if (moduleFilter) {
      query.module = moduleFilter;
    }

    // Seed mock logs if collection is empty
    const count = await AuditLog.countDocuments(query);
    if (count === 0 && !search && !moduleFilter) {
      const mockUser = await User.findOne({ role: 'super_admin' });
      const userId = mockUser ? mockUser._id : new crypto.webcrypto.UUID();
      const userEmail = mockUser ? mockUser.email : 'superadmin@gmail.com';

      await AuditLog.insertMany([
        {
          userId,
          userEmail,
          userRole: 'super_admin',
          action: 'LOGIN',
          module: 'SYSTEM',
          details: 'Super admin logged in successfully from Firefox browser',
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/125.0',
          createdAt: new Date(Date.now() - 3600000 * 2)
        },
        {
          userId,
          userEmail,
          userRole: 'super_admin',
          action: 'CREATE_BRANCH',
          module: 'ORGANIZATION',
          details: 'Created Lucknow Head Office branch profile',
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
          createdAt: new Date(Date.now() - 3600000)
        },
        {
          userId,
          userEmail,
          userRole: 'super_admin',
          action: 'UPLOAD_ASSET',
          module: 'CONTENT',
          details: 'Uploaded media asset file: Scholarship_SkillUp_Certificate.pdf',
          ipAddress: '192.168.1.105',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
          createdAt: new Date()
        }
      ]);
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      logs,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete an audit log
router.delete('/audit-logs/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const deleted = await AuditLog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    res.status(200).json({ success: true, message: 'Audit log entry removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// BACKUP & RESTORE ENDPOINTS
// ----------------------------------------------------

// List backup files
router.get('/backup', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({ success: true, backups: files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Trigger backup write
router.post('/backup', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const filename = `backup_${Date.now()}.json`;
    const filePath = path.join(backupsDir, filename);

    const backupPayload = {
      metadata: {
        ngoName: 'SAVITRAM FOUNDATION',
        version: '1.0.0',
        createdAt: new Date().toISOString()
      },
      users: await User.find({}),
      branches: await Branch.find({}),
      departments: await Department.find({}),
      members: await Member.find({}),
      volunteers: await Volunteer.find({}),
      beneficiaries: await Beneficiary.find({}),
      donations: await Donation.find({}),
      expenses: await Expense.find({}),
      projects: await Project.find({}),
      events: await Event.find({}),
      galleryItems: await GalleryItem.find({}),
      newsPosts: await NewsPost.find({}),
      systemConfigs: await SystemConfig.find({}),
      cmsConfigs: await CmsConfig.find({}),
      auditLogs: await AuditLog.find({}),
      apiKeys: await ApiKey.find({})
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2));

    await logActivity(req, 'CREATE_BACKUP', 'SYSTEM', `Created database JSON backup archive: ${filename}`);

    res.status(201).json({
      success: true,
      message: 'System backup file created successfully',
      backup: {
        filename,
        size: fs.statSync(filePath).size,
        createdAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download backup file
router.get('/backup/:filename/download', verifyToken, verifySuperAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve(backupsDir, filename);

    // Security check to avoid path traversal
    if (!filePath.startsWith(backupsDir)) {
      return res.status(403).json({ success: false, message: 'Invalid target path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a backup archive
router.delete('/backup/:filename', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve(backupsDir, filename);

    if (!filePath.startsWith(backupsDir)) {
      return res.status(403).json({ success: false, message: 'Invalid target path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    fs.unlinkSync(filePath);
    await logActivity(req, 'DELETE_BACKUP', 'SYSTEM', `Removed backup archive from disk: ${filename}`);

    res.status(200).json({ success: true, message: 'Backup file removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Restore database from uploaded JSON
router.post('/backup/restore', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData || !backupData.metadata) {
      return res.status(400).json({ success: false, message: 'Invalid backup file structure' });
    }

    // Dynamic clean & write transaction helper
    const restoreCollection = async (model, dataArray) => {
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        await model.deleteMany({});
        await model.insertMany(dataArray);
      }
    };

    await restoreCollection(User, backupData.users);
    await restoreCollection(Branch, backupData.branches);
    await restoreCollection(Department, backupData.departments);
    await restoreCollection(Member, backupData.members);
    await restoreCollection(Volunteer, backupData.volunteers);
    await restoreCollection(Beneficiary, backupData.beneficiaries);
    await restoreCollection(Donation, backupData.donations);
    await restoreCollection(Expense, backupData.expenses);
    await restoreCollection(Project, backupData.projects);
    await restoreCollection(Event, backupData.events);
    await restoreCollection(GalleryItem, backupData.galleryItems);
    await restoreCollection(NewsPost, backupData.newsPosts);
    await restoreCollection(SystemConfig, backupData.systemConfigs);
    await restoreCollection(CmsConfig, backupData.cmsConfigs);
    await restoreCollection(ApiKey, backupData.apiKeys);

    await logActivity(req, 'RESTORE_DATABASE', 'SYSTEM', `Restored database payload from backup archive created on ${backupData.metadata.createdAt}`);

    res.status(200).json({
      success: true,
      message: 'System database restored successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// API KEYS ENDPOINTS
// ----------------------------------------------------

// List generated api keys
router.get('/api-keys', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const keys = await ApiKey.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, apiKeys: keys });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate new api key
router.post('/api-keys', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { name, scopes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Client name is required' });
    }

    const token = `savitram_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = token.substring(0, 16);
    const hashedKey = crypto.createHash('sha256').update(token).digest('hex');

    const newKey = await ApiKey.create({
      name,
      keyPrefix,
      hashedKey,
      scopes: scopes || ['read'],
      status: 'Active'
    });

    await logActivity(req, 'GENERATE_API_KEY', 'SYSTEM', `Created external API integration access token for: ${name}`);

    res.status(201).json({
      success: true,
      message: 'External API integration access token generated successfully',
      rawKey: token,
      apiKey: newKey
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke access key
router.delete('/api-keys/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const updated = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { status: 'Revoked' },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'API Key not found' });
    }

    await logActivity(req, 'REVOKE_API_KEY', 'SYSTEM', `Revoked external API integration access token for: ${updated.name}`);

    res.status(200).json({ success: true, message: 'API access key status marked as Revoked', apiKey: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// SYSTEM CONFIG / CONFIGURATION SETTINGS
// ----------------------------------------------------

// Fetch configurations
router.get('/config', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne({});
    if (!config) {
      config = await SystemConfig.create({
        webhookUrl: 'https://api.savitram.org/v1/webhook-receiver',
        webhookEvents: ['member.created', 'donation.received'],
        r2AccessKey: 'r2_access_key_placeholder',
        r2SecretKey: 'r2_secret_key_placeholder',
        twilioSid: 'twilio_sid_placeholder',
        twilioToken: 'twilio_token_placeholder'
      });
    }

    // Mask secret credentials for presentation layer
    const masked = {
      webhookUrl: config.webhookUrl,
      webhookEvents: config.webhookEvents,
      r2AccessKey: config.r2AccessKey ? `${config.r2AccessKey.substring(0, 4)}***` : '',
      r2SecretKey: config.r2SecretKey ? '********' : '',
      twilioSid: config.twilioSid ? `${config.twilioSid.substring(0, 4)}***` : '',
      twilioToken: config.twilioToken ? '********' : ''
    };

    res.status(200).json({ success: true, config: masked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update configurations
router.post('/config', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { webhookUrl, webhookEvents, r2AccessKey, r2SecretKey, twilioSid, twilioToken } = req.body;

    let config = await SystemConfig.findOne({});
    if (!config) {
      config = new SystemConfig();
    }

    if (webhookUrl !== undefined) config.webhookUrl = webhookUrl;
    if (webhookEvents !== undefined) config.webhookEvents = webhookEvents;
    if (r2AccessKey && !r2AccessKey.endsWith('***')) config.r2AccessKey = r2AccessKey;
    if (r2SecretKey && r2SecretKey !== '********') config.r2SecretKey = r2SecretKey;
    if (twilioSid && !twilioSid.endsWith('***')) config.twilioSid = twilioSid;
    if (twilioToken && twilioToken !== '********') config.twilioToken = twilioToken;

    await config.save();

    await logActivity(req, 'UPDATE_SYSTEM_CONFIG', 'SYSTEM', 'Saved credentials parameters and webhooks dispatch endpoints configuration');

    res.status(200).json({ success: true, message: 'System integrations configuration saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// AI CENTER ENDPOINT
// ----------------------------------------------------

router.post('/ai', verifyToken, verifySuperAdmin, async (req, res) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt content is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a smart NGO operations assistant for SAVITRAM FOUNDATION. Help with donation analysis, volunteer management, event planning, branch operations, and finance insights. Be concise and professional.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';

    await logActivity(req, 'ASK_AI_CENTER', 'SYSTEM', `Queried AI assistant with prompt: "${prompt.substring(0, 40)}..."`);

    res.status(200).json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
