import Donation from '../models/Donation.js';
import Expense from '../models/Expense.js';
import Member from '../models/Member.js';
import Volunteer from '../models/Volunteer.js';
import Project from '../models/Project.js';
import Branch from '../models/Branch.js';

// GET superadmin full audit reports and trends
export const getSuperAdminReports = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    const queryFilter = {};
    if (branchId) queryFilter.branch = branchId;

    if (startDate || endDate) {
      queryFilter.createdAt = {};
      if (startDate) queryFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryFilter.createdAt.$lte = end;
      }
    }

    // 1. Core Summary Metrics
    const [totalDonationsAgg, totalExpensesAgg, membersCount, volunteersCount] = await Promise.all([
      Donation.aggregate([
        { $match: { ...queryFilter, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { ...queryFilter, paymentStatus: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Member.countDocuments(queryFilter),
      Volunteer.countDocuments(queryFilter)
    ]);

    const totalIncome = totalDonationsAgg[0]?.total || 0;
    const totalExpenses = totalExpensesAgg[0]?.total || 0;

    // 2. Monthly Trend (Income vs Expenditure) over the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyDonations, monthlyExpenses] = await Promise.all([
      Donation.aggregate([
        {
          $match: {
            ...queryFilter,
            paymentStatus: 'completed',
            donationDate: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$donationDate' },
              month: { $month: '$donationDate' }
            },
            total: { $sum: '$amount' }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            ...queryFilter,
            paymentStatus: 'approved',
            date: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Format monthly trend data cleanly
    const months = [];
    const tempDate = new Date(sixMonthsAgo);
    for (let i = 0; i < 6; i++) {
      months.push({
        year: tempDate.getFullYear(),
        month: tempDate.getMonth() + 1,
        label: tempDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        donations: 0,
        expenses: 0
      });
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    monthlyDonations.forEach(d => {
      const match = months.find(m => m.year === d._id.year && m.month === d._id.month);
      if (match) match.donations = d.total;
    });

    monthlyExpenses.forEach(e => {
      const match = months.find(m => m.year === e._id.year && m.month === e._id.month);
      if (match) match.expenses = e.total;
    });

    // 3. Category distribution breakdowns
    const expenseCategories = await Expense.aggregate([
      { $match: { ...queryFilter, paymentStatus: 'approved' } },
      { $group: { _id: '$category', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } }
    ]);

    const donationPurposes = await Donation.aggregate([
      { $match: { ...queryFilter, paymentStatus: 'completed' } },
      { $group: { _id: '$purpose', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } }
    ]);

    // 4. Branch comparison breakdown
    const branchComparison = await Branch.aggregate([
      {
        $lookup: {
          from: 'donations',
          localField: '_id',
          foreignField: 'branch',
          as: 'donations'
        }
      },
      {
        $lookup: {
          from: 'expenses',
          localField: '_id',
          foreignField: 'branch',
          as: 'expenses'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          totalDonations: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$donations',
                    as: 'd',
                    cond: { $eq: ['$$d.paymentStatus', 'completed'] }
                  }
                },
                as: 'd',
                in: '$$d.amount'
              }
            }
          },
          totalExpenses: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$expenses',
                    as: 'e',
                    cond: { $eq: ['$$e.paymentStatus', 'approved'] }
                  }
                },
                as: 'e',
                in: '$$e.amount'
              }
            }
          }
        }
      },
      { $sort: { totalDonations: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netFunds: totalIncome - totalExpenses,
          membersCount,
          volunteersCount
        },
        monthlyTrend: months,
        expenseCategories,
        donationPurposes,
        branchComparison
      }
    });
  } catch (error) {
    console.error('Superadmin compilation reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate financial reports data' });
  }
};

// GET branch admin specific stats and logs
export const getAdminReports = async (req, res) => {
  try {
    const creatorFilter = { createdBy: req.user.id };

    // 1. Core Summary Metrics
    const [totalDonationsAgg, totalExpensesAgg, membersCount, volunteersCount, projectsCount] = await Promise.all([
      Donation.aggregate([
        { $match: { ...creatorFilter, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { ...creatorFilter, paymentStatus: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Member.countDocuments(creatorFilter),
      Volunteer.countDocuments(creatorFilter),
      Project.countDocuments(creatorFilter)
    ]);

    const totalIncome = totalDonationsAgg[0]?.total || 0;
    const totalExpenses = totalExpensesAgg[0]?.total || 0;

    // 2. Category distribution breakdowns
    const expenseCategories = await Expense.aggregate([
      { $match: { ...creatorFilter, paymentStatus: 'approved' } },
      { $group: { _id: '$category', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } }
    ]);

    const donationPurposes = await Donation.aggregate([
      { $match: { ...creatorFilter, paymentStatus: 'completed' } },
      { $group: { _id: '$purpose', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netFunds: totalIncome - totalExpenses,
          membersCount,
          volunteersCount,
          projectsCount
        },
        expenseCategories,
        donationPurposes
      }
    });
  } catch (error) {
    console.error('Admin compilation reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate branch reports' });
  }
};
