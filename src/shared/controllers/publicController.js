import Certificate from '../models/Certificate.js';
import Project from '../models/Project.js';
import Event from '../models/Event.js';
import Campaign from '../models/Campaign.js';

// GET /api/public/verify-certificate/:certId
export const verifyCertificate = async (req, res) => {
  try {
    const { certId } = req.params;

    const certificate = await Certificate.findOne({
      $or: [
        { certificateId: certId.toUpperCase() },
        { hash: certId }
      ]
    })
    .populate('createdBy', 'name')
    .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found. This document cannot be verified as authentic.'
      });
    }

    res.json({
      success: true,
      message: 'Certificate verified authentic',
      data: {
        certificateId: certificate.certificateId,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail,
        role: certificate.role,
        type: certificate.type,
        issueDate: certificate.issueDate,
        title: certificate.title,
        description: certificate.description,
        signatoryName: certificate.signatoryName,
        signatoryTitle: certificate.signatoryTitle,
        hash: certificate.hash,
        issuedBy: certificate.createdBy?.name || 'SAVITRAM FOUNDATION Office'
      }
    });
  } catch (error) {
    console.error('Public certificate verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification' });
  }
};

// GET /api/public/projects
export const getPublicProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: { $in: ['Active', 'Completed'] } })
      .populate('branch', 'name')
      .sort({ startDate: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('getPublicProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public projects' });
  }
};

// GET /api/public/projects/:id
export const getPublicProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('branch', 'name');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('getPublicProjectById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project details' });
  }
};

// GET /api/public/events
export const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: { $in: ['Planned', 'Active'] } })
      .populate('branch', 'name')
      .sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('getPublicEvents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public events' });
  }
};

// GET /api/public/events/:id
export const getPublicEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('branch', 'name');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('getPublicEventById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch event details' });
  }
};

// GET /api/public/campaigns
export const getPublicCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'Active' })
      .populate('branch', 'name')
      .sort({ startDate: -1 });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('getPublicCampaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public campaigns' });
  }
};

// GET /api/public/campaigns/:id
export const getPublicCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('branch', 'name');
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('getPublicCampaignById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign details' });
  }
};
