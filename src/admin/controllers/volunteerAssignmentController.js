import FoodDonation from '../../shared/models/FoodDonation.js';
import ManualTask from '../../shared/models/ManualTask.js';

// GET all volunteer assignments (both food and manual tasks)
export const getAllVolunteerAssignments = async (req, res) => {
  try {
    const [foodAssignments, manualAssignments] = await Promise.all([
      FoodDonation.find({ assignedVolunteer: { $ne: null } })
        .populate('assignedVolunteer', 'fullName email mobileNumber')
        .populate('assignedVolunteerUser', 'name email')
        .sort({ assignedAt: -1 })
        .lean(),
      ManualTask.find({ assignedVolunteer: { $ne: null } })
        .populate('assignedVolunteer', 'fullName email mobileNumber')
        .populate('assignedVolunteerUser', 'name email')
        .sort({ assignedAt: -1 })
        .lean(),
    ]);

    // Combine and format both types
    const allAssignments = [
      ...foodAssignments.map(d => ({
        _id: d._id,
        type: 'food',
        volunteer: d.assignedVolunteer,
        donation: {
          donorName: d.donorName,
          pickupAddress: d.pickupAddress,
        },
        status: d.status,
        assignedAt: d.assignedAt,
      })),
      ...manualAssignments.map(t => ({
        _id: t._id,
        type: 'manual',
        volunteer: t.assignedVolunteer,
        title: t.title,
        status: t.status,
        assignedAt: t.assignedAt,
      })),
    ];

    res.json({
      success: true,
      data: allAssignments,
    });
  } catch (error) {
    console.error('Error fetching volunteer assignments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};
