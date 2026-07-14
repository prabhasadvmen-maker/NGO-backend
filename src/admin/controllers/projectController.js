import Project from '../../shared/models/Project.js';
import Branch from '../../shared/models/Branch.js';
import Expense from '../../shared/models/Expense.js';

// Sanitize body fields
function sanitizeBody(body) {
  const optionalFields = ['branch', 'endDate', 'targetBeneficiaries', 'actualBeneficiaries', 'volunteersCount', 'budget'];
  const sanitized = { ...body };
  optionalFields.forEach(f => {
    if (sanitized[f] === '') {
      sanitized[f] = null;
    } else if (sanitized[f] === undefined) {
      delete sanitized[f];
    }
  });
  return sanitized;
}

// GET /api/admin/projects
export const getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Scoped strictly to projects created by this Admin
    const filter = { createdBy: req.user.id };

    if (status) filter.status = status;
    if (branch) filter.branch = branch;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('branch', 'name code')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Admin get all projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// GET /api/admin/projects/stats
export const getProjectStats = async (req, res) => {
  try {
    const totalCount = await Project.countDocuments({ createdBy: req.user.id });
    const activeCount = await Project.countDocuments({ createdBy: req.user.id, status: 'Active' });
    const plannedCount = await Project.countDocuments({ createdBy: req.user.id, status: 'Planned' });
    const completedCount = await Project.countDocuments({ createdBy: req.user.id, status: 'Completed' });
    const suspendedCount = await Project.countDocuments({ createdBy: req.user.id, status: 'Suspended' });

    // Aggregate budget and expenses
    const financialStats = await Project.aggregate([
      { $match: { createdBy: req.user.id } },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$budget' },
          totalExpenses: { $sum: '$expenses' },
          totalTargetBeneficiaries: { $sum: '$targetBeneficiaries' },
          totalActualBeneficiaries: { $sum: '$actualBeneficiaries' }
        }
      }
    ]);

    const stats = {
      totalCount,
      activeCount,
      plannedCount,
      completedCount,
      suspendedCount,
      totalBudget: financialStats[0]?.totalBudget || 0,
      totalExpenses: financialStats[0]?.totalExpenses || 0,
      totalTargetBeneficiaries: financialStats[0]?.totalTargetBeneficiaries || 0,
      totalActualBeneficiaries: financialStats[0]?.totalActualBeneficiaries || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin get project stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/admin/projects
export const createProject = async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    
    const project = new Project({
      ...sanitized,
      createdBy: req.user.id
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Admin create project error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create project' });
  }
};

// PUT /api/admin/projects/:id
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeBody(req.body);

    const project = await Project.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      {
        ...sanitized,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Admin update project error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update project' });
  }
};

// DELETE /api/admin/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Remove any associated expenses
    await Expense.deleteMany({ project: id });

    res.json({
      success: true,
      message: 'Project deleted successfully along with associated expenses'
    });
  } catch (error) {
    console.error('Admin delete project error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

// GET /api/admin/projects/:id/expenses
// List all expenses linked to a project
export const getProjectExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ project: req.params.id, createdBy: req.user.id })
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Admin get project expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project expenses' });
  }
};

// POST /api/admin/projects/:id/expenses
// Log a new expense to a project
export const addProjectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, date, paymentMethod, notes, branch } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    // Verify project exists
    const project = await Project.findOne({ _id: id, createdBy: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Create the expense
    const expense = new Expense({
      title,
      category: 'Project Expenditure',
      amount,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'approved',
      branch: branch || project.branch,
      project: id,
      notes,
      createdBy: req.user.id
    });

    await expense.save();

    // Increment Project's cumulative expenses
    project.expenses = (project.expenses || 0) + Number(amount);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: expense
    });
  } catch (error) {
    console.error('Admin add project expense error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record expense' });
  }
};

// DELETE /api/admin/projects/:projectId/expenses/:expenseId
// Delete a project expense and subtract the amount
export const deleteProjectExpense = async (req, res) => {
  try {
    const { projectId, expenseId } = req.params;

    const expense = await Expense.findOneAndDelete({ _id: expenseId, project: projectId, createdBy: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Decrement Project's cumulative expenses
    await Project.findOneAndUpdate(
      { _id: projectId, createdBy: req.user.id },
      { $inc: { expenses: -Number(expense.amount) } }
    );

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete project expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

// PUT /api/admin/projects/:projectId/expenses/:expenseId
// Update an existing project expense and adjust project cumulative amount
export const updateProjectExpense = async (req, res) => {
  try {
    const { projectId, expenseId } = req.params;
    const { title, amount, date, paymentMethod, notes } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    const expense = await Expense.findOne({ _id: expenseId, project: projectId, createdBy: req.user.id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const oldAmount = expense.amount;
    const newAmount = Number(amount);

    expense.title = title;
    expense.amount = newAmount;
    expense.date = date || expense.date;
    expense.paymentMethod = paymentMethod || expense.paymentMethod;
    expense.notes = notes;

    await expense.save();

    // Adjust Project's cumulative expenses: (newAmount - oldAmount)
    await Project.findOneAndUpdate(
      { _id: projectId, createdBy: req.user.id },
      { $inc: { expenses: newAmount - oldAmount } }
    );

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Admin update project expense error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update expense' });
  }
};
