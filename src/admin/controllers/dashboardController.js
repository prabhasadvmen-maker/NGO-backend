import Member from '../../shared/models/Member.js';
import Donation from '../../shared/models/Donation.js';

export const getDashboardStats = async (req, res) => {
  try {
    const donationStats = await Donation.aggregate([
      { $match: { createdBy: req.user.id, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDonationsSum = donationStats[0]?.total || 0;

    const [totalMembers, totalProjects, totalEvents, totalVolunteers, totalBeneficiaries] = await Promise.all([
      Member.countDocuments({ createdBy: req.user.id }),
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
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
