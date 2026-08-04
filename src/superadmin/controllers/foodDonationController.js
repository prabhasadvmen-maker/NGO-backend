import FoodDonation from '../../shared/models/FoodDonation.js';

/**
 * Get Food Donation Analytics for Superadmin
 * GET /api/superadmin/food-donations/analytics
 */
export const getFoodDonationAnalytics = async (req, res) => {
  try {
    const totalDonations = await FoodDonation.countDocuments();
    const statusCounts = await FoodDonation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const foodTypeCounts = await FoodDonation.aggregate([
      { $group: { _id: '$foodType', count: { $sum: 1 } } },
    ]);

    const orgTypeCounts = await FoodDonation.aggregate([
      { $group: { _id: '$organizationType', count: { $sum: 1 } } },
    ]);

    const impactAggregate = await FoodDonation.aggregate([
      { $match: { status: { $in: ['Distributed', 'Completed'] } } },
      {
        $group: {
          _id: null,
          totalPeopleFed: { $sum: '$actualPeopleServed' },
          totalCompleted: { $sum: 1 },
        },
      },
    ]);

    // Monthly breakdown for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await FoodDonation.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          peopleServed: { $sum: '$actualPeopleServed' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDonations,
          totalPeopleFed: impactAggregate[0]?.totalPeopleFed || 0,
          completedCount: impactAggregate[0]?.totalCompleted || 0,
        },
        statusCounts: statusCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        foodTypeCounts: foodTypeCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        orgTypeCounts: orgTypeCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        monthlyStats,
      },
    });
  } catch (error) {
    console.error('Error generating superadmin food donation analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message,
    });
  }
};

/**
 * Generate Food Donation Report Data
 * GET /api/superadmin/food-donations/reports
 */
export const getFoodDonationReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const donations = await FoodDonation.find(filter)
      .populate('assignedVolunteer', 'fullName mobileNumber email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: donations,
    });
  } catch (error) {
    console.error('Error generating food donation reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
};
