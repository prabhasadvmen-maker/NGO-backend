import Project from '../models/Project.js';
import Donation from '../models/Donation.js';
import Event from '../models/Event.js';
import Campaign from '../models/Campaign.js';
import Volunteer from '../models/Volunteer.js';
import Member from '../models/Member.js';
import Branch from '../models/Branch.js';
import CmsConfig from '../models/CmsConfig.js';

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
    const cms = await CmsConfig.findOne().lean();
    
    const volunteersCount = await Volunteer.countDocuments({ status: 'Active' });
    const membersCount = await Member.countDocuments({ status: 'Active' });
    const branchesCount = await Branch.countDocuments({ isActive: true });
    const projectsCount = await Project.countDocuments({ status: 'Completed' });
    
    const livesImpacted = cms?.stats?.livesImpacted || 12500;

    res.json({
      success: true,
      data: {
        livesImpacted,
        volunteersCount: volunteersCount || cms?.stats?.volunteersCount || 450,
        projectsCount: projectsCount || cms?.stats?.projectsCompleted || 35,
        branchesCount: branchesCount || 1,
        membersCount: membersCount || 500
      }
    });
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

