import Member from '../../shared/models/Member.js';
import Donation from '../../shared/models/Donation.js';
import Beneficiary from '../../shared/models/Beneficiary.js';
import Volunteer from '../../shared/models/Volunteer.js';
import Project from '../../shared/models/Project.js';
import Event from '../../shared/models/Event.js';

export const getDashboardStats = async (req, res) => {
  try {
    const donationStats = await Donation.aggregate([
      { $match: { createdBy: req.user.id, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDonationsSum = donationStats[0]?.total || 0;

    const [totalMembers, totalProjects, totalEvents, totalVolunteers, totalBeneficiaries] = await Promise.all([
      Member.countDocuments({ createdBy: req.user.id }),
      Project.countDocuments({ createdBy: req.user.id }),
      Event.countDocuments({ createdBy: req.user.id }),
      Volunteer.countDocuments({ createdBy: req.user.id }),
      Beneficiary.countDocuments({ createdBy: req.user.id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        members: totalMembers,
        donations: totalDonationsSum,
        projects: totalProjects,
        events: totalEvents,
        volunteers: totalVolunteers,
        beneficiaries: totalBeneficiaries,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
