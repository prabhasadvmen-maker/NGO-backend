import Project from '../models/Project.js';
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
    const events = await Event.find({ status: { $in: ['Active', 'Planned'] } })
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
