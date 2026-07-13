import fs from 'fs';
import path from 'path';
import CommunicationLog from '../../shared/models/CommunicationLog.js';
import Member from '../../shared/models/Member.js';
import Volunteer from '../../shared/models/Volunteer.js';
import Beneficiary from '../../shared/models/Beneficiary.js';
import Donation from '../../shared/models/Donation.js';
import { dispatchBulkCommunication } from '../../utils/communication.js';

const MOCK_INBOX_PATH = path.resolve('scratch', 'communication_inbox.json');

// POST /api/admin/communication/send
export const sendBranchBulkCommunication = async (req, res) => {
  try {
    const { type, subject, message, recipientType } = req.body;
    if (!type || !message || !recipientType) {
      return res.status(400).json({ success: false, message: 'Type, message and recipientType are required' });
    }

    // 1. Resolve recipients strictly scoped to the admin's branch
    let recipients = [];
    const filter = { branch: req.user.branch };

    if (recipientType === 'Members') {
      const docs = await Member.find(filter, 'fullName email mobileNumber').lean();
      recipients = docs.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber }));
    } else if (recipientType === 'Volunteers') {
      const docs = await Volunteer.find(filter, 'fullName email mobileNumber').lean();
      recipients = docs.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber }));
    } else if (recipientType === 'Beneficiaries') {
      const docs = await Beneficiary.find(filter, 'fullName email mobileNumber').lean();
      recipients = docs.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber }));
    } else if (recipientType === 'Donors') {
      const docs = await Donation.find(filter, 'donorName email mobileNumber').lean();
      const seen = new Set();
      docs.forEach(d => {
        if (d.email && !seen.has(d.email)) {
          seen.add(d.email);
          recipients.push({ name: d.donorName, email: d.email, mobile: d.mobileNumber });
        }
      });
    } else {
      // All
      const [m, v, b] = await Promise.all([
        Member.find(filter, 'fullName email mobileNumber').lean(),
        Volunteer.find(filter, 'fullName email mobileNumber').lean(),
        Beneficiary.find(filter, 'fullName email mobileNumber').lean()
      ]);
      recipients = [
        ...m.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber })),
        ...v.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber })),
        ...b.map(d => ({ name: d.fullName, email: d.email, mobile: d.mobileNumber }))
      ];
    }

    // Create log record
    const log = new CommunicationLog({
      type,
      subject: subject || '',
      message,
      recipientType,
      recipientsCount: recipients.length,
      branch: req.user.branch, // Enforced
      sentBy: req.user.id,
      status: 'Sent'
    });

    await log.save();

    // Call communication dispatcher
    if (recipients.length > 0) {
      await dispatchBulkCommunication(log, recipients);
    }

    return res.status(200).json({
      success: true,
      message: `Bulk ${type} sent successfully to ${recipients.length} recipients`,
      data: log
    });
  } catch (error) {
    console.error('Send branch bulk communication error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send communication' });
  }
};

// GET /api/admin/communication/logs
export const getBranchCommunicationLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Scoped strictly to admin's branch
    const filter = { branch: req.user.branch };
    if (type) filter.type = type;

    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter)
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CommunicationLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get branch communication logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

// DELETE /api/admin/communication/logs/:id
export const deleteBranchCommunicationLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CommunicationLog.findOneAndDelete({ _id: id, branch: req.user.branch });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Log not found or access denied' });
    }
    return res.status(200).json({ success: true, message: 'Communication log deleted' });
  } catch (error) {
    console.error('Delete branch communication log error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete log' });
  }
};
