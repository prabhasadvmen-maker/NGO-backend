import Expense from '../../shared/models/Expense.js';
import Project from '../../shared/models/Project.js';
import Branch from '../../shared/models/Branch.js';

// GET all expenses with pagination, search, and filters
export const getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      paymentStatus = '',
      branch = '',
      project = '',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (category) filter.category = category;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (branch) filter.branch = branch;
    if (project) filter.project = project;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { expenseId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('branch', 'name code')
        .populate('project', 'title budget')
        .populate('event', 'title')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Expense.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Superadmin get all expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

// GET detailed stats for expenses
export const getExpenseStats = async (req, res) => {
  try {
    const totalCount = await Expense.countDocuments();
    const approvedCount = await Expense.countDocuments({ paymentStatus: 'approved' });
    const pendingCount = await Expense.countDocuments({ paymentStatus: 'pending' });

    // Aggregate total expense amount
    const amountStats = await Expense.aggregate([
      { $match: { paymentStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = amountStats[0]?.total || 0;

    // Aggregate by category
    const categoryStats = await Expense.aggregate([
      { $match: { paymentStatus: 'approved' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Aggregate by branch
    const branchStats = await Expense.aggregate([
      { $match: { paymentStatus: 'approved' } },
      { $group: { _id: '$branch', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    await Branch.populate(branchStats, { path: '_id', select: 'name code' });

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyStats = await Expense.aggregate([
      {
        $match: {
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
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        approvedCount,
        pendingCount,
        totalAmount,
        categoryBreakdown: categoryStats,
        branchBreakdown: branchStats,
        monthlyTrend: monthlyStats
      }
    });
  } catch (error) {
    console.error('Superadmin get expense stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile expense stats' });
  }
};

// GET detailed single expense
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('branch', 'name code city state')
      .populate('project', 'title budget')
      .populate('event', 'title')
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    console.error('Superadmin get expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve expense' });
  }
};

// POST record new expense
export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, project, branch } = req.body;

    if (!title || !amount || !category || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Title, amount, category, and payment method are required' });
    }

    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
      }
    }

    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID' });
      }
    }

    const expense = new Expense({
      ...req.body,
      createdBy: req.user.id
    });

    if (expense.paymentStatus === 'approved') {
      expense.approvedBy = req.user.id;
    }

    await expense.save();

    // If approved and linked to a project, update project expenses
    if (expense.paymentStatus === 'approved' && project) {
      await Project.findByIdAndUpdate(project, { $inc: { expenses: amount } });
    }

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense
    });
  } catch (error) {
    console.error('Superadmin create expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
};

// PUT update expense details
export const updateExpense = async (req, res) => {
  try {
    const oldExpense = await Expense.findById(req.params.id);
    if (!oldExpense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    const { project, amount, paymentStatus } = req.body;

    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
      }
    }

    const updatedData = { ...req.body };
    if (paymentStatus === 'approved' && oldExpense.paymentStatus !== 'approved') {
      updatedData.approvedBy = req.user.id;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    // Sync project expenses budget updates
    const oldAmt = oldExpense.paymentStatus === 'approved' ? oldExpense.amount : 0;
    const newAmt = updatedExpense.paymentStatus === 'approved' ? updatedExpense.amount : 0;
    const oldProjId = oldExpense.project;
    const newProjId = updatedExpense.project;

    if (String(oldProjId) === String(newProjId)) {
      if (oldProjId && (newAmt - oldAmt !== 0)) {
        await Project.findByIdAndUpdate(oldProjId, { $inc: { expenses: newAmt - oldAmt } });
      }
    } else {
      if (oldProjId && oldAmt > 0) {
        await Project.findByIdAndUpdate(oldProjId, { $inc: { expenses: -oldAmt } });
      }
      if (newProjId && newAmt > 0) {
        await Project.findByIdAndUpdate(newProjId, { $inc: { expenses: newAmt } });
      }
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Superadmin update expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};

// DELETE remove expense record
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    // Revert project budget expenses if approved and linked to project
    if (expense.paymentStatus === 'approved' && expense.project) {
      await Project.findByIdAndUpdate(expense.project, { $inc: { expenses: -expense.amount } });
    }

    res.json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    console.error('Superadmin delete expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
