import Member from '../../shared/models/Member.js';

export const getDashboardStats = async (req, res) => {
  try {
    const [totalMembers, totalDonations, totalProjects, totalEvents, totalVolunteers, totalBeneficiaries] = await Promise.all([
      Member.countDocuments({ createdBy: req.user.id }),
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
      Promise.resolve(0),
    ]);
    res.status(200).json({
      success: true,
      data: {
        members: totalMembers,
        donations: totalDonations,
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
