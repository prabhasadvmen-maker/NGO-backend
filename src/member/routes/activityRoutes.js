import express from 'express';
import { verifyToken, verifyMember } from '../../shared/middleware/auth.js';
import {
  getMemberDonations,
  getMemberCertificates,
  getMemberEvents,
  registerMemberEvent,
  cancelMemberEventRegistration,
  getVolunteerProfile,
  applyAsVolunteer,
  getMemberProjects,
  joinMemberProject,
  leaveMemberProject,
  getMemberReferrals,
  getMemberNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getHelpQueries,
  submitHelpQuery,
  changeMemberPassword,
  getNotificationSettings,
  updateNotificationSettings
} from '../controllers/activityController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken, verifyMember);

// Donation routes
router.get('/donations', getMemberDonations);

// Certificate routes
router.get('/certificates', getMemberCertificates);

// Event routes
router.get('/events', getMemberEvents);
router.post('/events/:id/register', registerMemberEvent);
router.post('/events/:id/cancel', cancelMemberEventRegistration);

// Volunteer routes
router.get('/volunteer', getVolunteerProfile);
router.post('/volunteer/apply', applyAsVolunteer);

// Project routes
router.get('/projects', getMemberProjects);
router.post('/projects/:id/join', joinMemberProject);
router.post('/projects/:id/leave', leaveMemberProject);

// Referral routes
router.get('/referrals', getMemberReferrals);

// Notification routes
router.get('/notifications', getMemberNotifications);
router.post('/notifications/:id/read', markNotificationRead);
router.post('/notifications/read-all', markAllNotificationsRead);

// Help / Support routes
router.get('/help', getHelpQueries);
router.post('/help', submitHelpQuery);

// Settings routes
router.post('/settings/change-password', changeMemberPassword);
router.get('/settings/notifications', getNotificationSettings);
router.put('/settings/notifications', updateNotificationSettings);

export default router;
