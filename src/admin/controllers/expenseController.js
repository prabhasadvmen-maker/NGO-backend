import Expense from '../../shared/models/Expense.js';
import Project from '../../shared/models/Project.js';
import Branch from '../../shared/models/Branch.js';

// GET branch expenses (created by this admin)
export const getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      paymentStatus = '',
      project = '',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Strict scoping to creator
    const filter = { createdBy: req.user.id };

    if (category) filter.category = category;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
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
    console.error('Admin get all expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

// GET detailed stats for branch expenses
export const getExpenseStats = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    const totalCount = await Expense.countDocuments(filter);
    const approvedCount = await Expense.countDocuments({ ...filter, paymentStatus: 'approved' });
    const pendingCount = await Expense.countDocuments({ ...filter, paymentStatus: 'pending' });

    // Aggregate total approved amount
    const amountStats = await Expense.aggregate([
      { $match: { createdBy: req.user.id, paymentStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAmount = amountStats[0]?.total || 0;

    // Aggregate by category
    const categoryStats = await Expense.aggregate([
      { $match: { createdBy: req.user.id, paymentStatus: 'approved' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        approvedCount,
        pendingCount,
        totalAmount,
        categoryBreakdown: categoryStats
      }
    });
  } catch (error) {
    console.error('Admin get expense stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile expense stats' });
  }
};

// GET single branch expense details
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('branch', 'name code')
      .populate('project', 'title budget')
      .populate('event', 'title');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    console.error('Admin get expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve expense' });
  }
};

// POST submit branch expense request (defaults to pending)
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
      paymentStatus: 'pending', // Scoped admin expenses must be approved by Superadmin
      approvedBy: null,
      createdBy: req.user.id
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: 'Expense request submitted successfully for approval',
      data: expense
    });
  } catch (error) {
    console.error('Admin create expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit expense request' });
  }
};

// PUT update expense request (only if still pending!)
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (expense.paymentStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot edit an expense that has already been processed' });
    }

    const { project } = req.body;
    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
      }
    }

    // Force values that cannot be altered by branch admins
    const updatedData = {
      ...req.body,
      paymentStatus: 'pending',
      approvedBy: null
    };

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Expense request updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Admin update expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to update expense request' });
  }
};

// DELETE remove pending expense request
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (expense.paymentStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot delete an expense that has already been approved/rejected' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Expense request deleted successfully' });
  } catch (error) {
    console.error('Admin delete expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense request' });
  }
};
