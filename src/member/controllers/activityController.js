import Member from '../../shared/models/Member.js';
import Donation from '../../shared/models/Donation.js';
import Certificate from '../../shared/models/Certificate.js';
import Event from '../../shared/models/Event.js';
import EventRegistration from '../../shared/models/EventRegistration.js';
import Volunteer from '../../shared/models/Volunteer.js';
import Project from '../../shared/models/Project.js';
import Notification from '../../shared/models/Notification.js';
import ContactQuery from '../../shared/models/ContactQuery.js';
import bcrypt from 'bcryptjs';
import { getViewPresignedUrl } from '../../utils/r2.js';

// GET /api/member/activities/donations
export const getMemberDonations = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const queries = [];
    if (member.email) queries.push({ donorEmail: member.email });
    if (member.mobileNumber) queries.push({ donorPhone: member.mobileNumber });

    if (queries.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const donations = await Donation.find({ $or: queries }).sort({ donationDate: -1 });
    res.json({ success: true, data: donations });
  } catch (error) {
    console.error('getMemberDonations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
};

// GET /api/member/activities/certificates
export const getMemberCertificates = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (!member.email) {
      return res.json({ success: true, data: [] });
    }

    const certificates = await Certificate.find({ recipientEmail: member.email }).sort({ issueDate: -1 });
    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('getMemberCertificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
};

// GET /api/member/activities/events
export const getMemberEvents = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const events = await Event.find({ status: { $in: ['Planned', 'Active', 'Completed'] } })
      .populate('branch', 'name')
      .sort({ startDate: 1 })
      .lean();

    // Check registrations
    const registeredIds = await EventRegistration.find({
      email: member.email,
      status: { $in: ['Confirmed', 'Attended'] }
    }).distinct('event');

    const formatted = events.map(event => ({
      ...event,
      isRegistered: registeredIds.some(id => id.toString() === event._id.toString())
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('getMemberEvents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

// POST /api/member/activities/events/:id/register
export const registerMemberEvent = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (!member.email) {
      return res.status(400).json({ success: false, message: 'An email is required to register for events. Please update your profile.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status === 'Completed' || event.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Event has already ended or been cancelled' });
    }

    // Check if already registered
    const existing = await EventRegistration.findOne({ event: event._id, email: member.email });
    if (existing && existing.status !== 'Cancelled') {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }

    // Capacity limit
    if (event.capacity > 0 && event.registrationsCount >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event capacity has been fully booked' });
    }

    if (existing && existing.status === 'Cancelled') {
      existing.status = 'Confirmed';
      await existing.save();
    } else {
      const reg = new EventRegistration({
        event: event._id,
        name: member.fullName,
        email: member.email,
        phone: member.mobileNumber,
        status: 'Confirmed',
        notes: 'Registered via Member Portal'
      });
      await reg.save();
    }

    event.registrationsCount = (event.registrationsCount || 0) + 1;
    await event.save();

    res.json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    console.error('registerMemberEvent error:', error);
    res.status(500).json({ success: false, message: 'Failed to register for event' });
  }
};

// POST /api/member/activities/events/:id/cancel
export const cancelMemberEventRegistration = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const registration = await EventRegistration.findOne({ event: event._id, email: member.email });
    if (!registration || registration.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'No active registration found for this event' });
    }

    registration.status = 'Cancelled';
    await registration.save();

    event.registrationsCount = Math.max(0, (event.registrationsCount || 0) - 1);
    await event.save();

    res.json({ success: true, message: 'Successfully cancelled event registration' });
  } catch (error) {
    console.error('cancelMemberEventRegistration error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel event registration' });
  }
};

// GET /api/member/activities/volunteer
export const getVolunteerProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const queries = [];
    if (member.email) queries.push({ email: member.email });
    if (member.mobileNumber) queries.push({ mobileNumber: member.mobileNumber });

    if (queries.length === 0) {
      return res.json({ success: true, data: null });
    }

    const volunteer = await Volunteer.findOne({ $or: queries })
      .populate('branch', 'name code city state')
      .lean();

    res.json({ success: true, data: volunteer });
  } catch (error) {
    console.error('getVolunteerProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch volunteer profile' });
  }
};

// POST /api/member/activities/volunteer/apply
export const applyAsVolunteer = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if already registered
    const queries = [];
    if (member.email) queries.push({ email: member.email });
    if (member.mobileNumber) queries.push({ mobileNumber: member.mobileNumber });

    if (queries.length > 0) {
      const existing = await Volunteer.findOne({ $or: queries });
      if (existing) {
        return res.status(400).json({ success: false, message: 'You are already registered or have a pending application as a volunteer' });
      }
    }

    const { skills, availability, address, city, district, state, pinCode, branchId } = req.body;

    const assignedBranch = member.branch || branchId;
    if (!assignedBranch) {
      return res.status(400).json({ success: false, message: 'A branch assignment is required to apply' });
    }

    const volunteer = new Volunteer({
      fullName: member.fullName,
      mobileNumber: member.mobileNumber,
      email: member.email,
      profilePhoto: member.profilePhoto,
      skills: skills || [],
      availability: availability || 'Part-time',
      address: address || member.address,
      city: city || '',
      district: district || member.district || '',
      state: state || member.state || '',
      pinCode: pinCode || member.pinCode || '',
      status: 'Pending',
      branch: assignedBranch,
      createdBy: member.createdBy
    });

    await volunteer.save();
    res.json({ success: true, message: 'Volunteering application submitted successfully', data: volunteer });
  } catch (error) {
    console.error('applyAsVolunteer error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

// GET /api/member/activities/projects
export const getMemberProjects = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const projects = await Project.find({ status: { $in: ['Planned', 'Active', 'Completed'] } })
      .populate('branch', 'name')
      .sort({ startDate: -1 })
      .lean();

    const formatted = projects.map(project => ({
      ...project,
      isJoined: member.joinedProjects ? member.joinedProjects.some(id => id.toString() === project._id.toString()) : false
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('getMemberProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// POST /api/member/activities/projects/:id/join
export const joinMemberProject = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status === 'Completed' || project.status === 'Suspended') {
      return res.status(400).json({ success: false, message: 'Project is already completed or suspended' });
    }

    // Check if already joined
    const isAlreadyJoined = member.joinedProjects && member.joinedProjects.some(id => id.toString() === project._id.toString());
    if (isAlreadyJoined) {
      return res.status(400).json({ success: false, message: 'You have already joined this project' });
    }

    if (!member.joinedProjects) member.joinedProjects = [];
    member.joinedProjects.push(project._id);
    await member.save();

    project.volunteersCount = (project.volunteersCount || 0) + 1;
    await project.save();

    // Create a notification
    await Notification.create({
      recipient: member._id,
      title: 'Joined Project',
      message: `You have successfully joined the project: ${project.title}. Thank you for volunteering!`,
      type: 'Project'
    });

    res.json({ success: true, message: 'Joined project successfully' });
  } catch (error) {
    console.error('joinMemberProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to join project' });
  }
};

// POST /api/member/activities/projects/:id/leave
export const leaveMemberProject = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isJoined = member.joinedProjects && member.joinedProjects.some(id => id.toString() === project._id.toString());
    if (!isJoined) {
      return res.status(400).json({ success: false, message: 'You have not joined this project' });
    }

    member.joinedProjects = member.joinedProjects.filter(id => id.toString() !== project._id.toString());
    await member.save();

    project.volunteersCount = Math.max(0, (project.volunteersCount || 0) - 1);
    await project.save();

    // Create a notification
    await Notification.create({
      recipient: member._id,
      title: 'Left Project',
      message: `You have left the project: ${project.title}.`,
      type: 'Project'
    });

    res.json({ success: true, message: 'Left project successfully' });
  } catch (error) {
    console.error('leaveMemberProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave project' });
  }
};

// GET /api/member/activities/referrals
export const getMemberReferrals = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const referredMembers = await Member.find({ referredBy: member.memberId })
      .select('fullName memberId joiningDate status email profilePhoto')
      .lean();

    // Process photo view URLs if present
    const referrals = await Promise.all(
      referredMembers.map(async ref => {
        let photoUrl = null;
        if (ref.profilePhoto) {
          photoUrl = await getViewPresignedUrl(ref.profilePhoto).catch(() => null);
        }
        return {
          ...ref,
          photoUrl
        };
      })
    );

    const totalReferrals = referrals.length;
    const activeCount = referrals.filter(r => r.status === 'Active').length;
    const pendingCount = referrals.filter(r => r.status === 'Pending').length;
    const pointsEarned = activeCount * 100; // Industrial points structure

    res.json({
      success: true,
      data: {
        referralCode: member.memberId,
        referrals,
        stats: {
          totalReferrals,
          activeCount,
          pendingCount,
          pointsEarned
        }
      }
    });
  } catch (error) {
    console.error('getMemberReferrals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch referrals' });
  }
};

// GET /api/member/activities/notifications
export const getMemberNotifications = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const notifications = await Notification.find({
      $or: [
        { recipient: member._id },
        { recipient: null }
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('getMemberNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// POST /api/member/activities/notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ recipient: req.user.id }, { recipient: null }] },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

// POST /api/member/activities/notifications/read-all
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ recipient: req.user.id }, { recipient: null }], isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// GET /api/member/activities/help
export const getHelpQueries = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const queries = await ContactQuery.find({ email: member.email })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    console.error('getHelpQueries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch help queries' });
  }
};

// POST /api/member/activities/help
export const submitHelpQuery = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const { subject, message, phone } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const query = new ContactQuery({
      name: member.fullName,
      email: member.email,
      phone: phone || member.mobileNumber || '',
      subject,
      message,
      branch: member.branch || null,
      status: 'Unread'
    });

    await query.save();

    // Notify member of query creation
    await Notification.create({
      recipient: member._id,
      title: 'Help Ticket Created',
      message: `Your help ticket "${subject}" has been successfully created. We will get back to you soon.`,
      type: 'System'
    });

    res.status(201).json({ success: true, message: 'Help query submitted successfully', data: query });
  } catch (error) {
    console.error('submitHelpQuery error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit help query' });
  }
};

// POST /api/member/activities/settings/change-password
export const changeMemberPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old password and new password are required' });
    }

    const member = await Member.findById(req.user.id).select('+password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, member.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    member.password = newPassword;
    await member.save();

    await Notification.create({
      recipient: member._id,
      title: 'Password Changed',
      message: 'Your account password was updated successfully.',
      type: 'System'
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('changeMemberPassword error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

// GET /api/member/activities/settings/notifications
export const getNotificationSettings = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.json({ success: true, data: member.notificationPreferences || {} });
  } catch (error) {
    console.error('getNotificationSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification settings' });
  }
};

// PUT /api/member/activities/settings/notifications
export const updateNotificationSettings = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const { email, sms, events, donations } = req.body;
    member.notificationPreferences = {
      email: email !== undefined ? email : member.notificationPreferences.email,
      sms: sms !== undefined ? sms : member.notificationPreferences.sms,
      events: events !== undefined ? events : member.notificationPreferences.events,
      donations: donations !== undefined ? donations : member.notificationPreferences.donations,
    };

    await member.save();
    res.json({ success: true, message: 'Notification preferences updated successfully', data: member.notificationPreferences });
  } catch (error) {
    console.error('updateNotificationSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification settings' });
  }
};
