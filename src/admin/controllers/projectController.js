import Project from '../../shared/models/Project.js';
import Branch from '../../shared/models/Branch.js';

function sanitizeBody(body) {
  const optionalFields = ['branch', 'endDate', 'notes'];
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
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { createdBy: req.user.id };

    if (status) filter.status = status;

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
    const filter = { createdBy: req.user.id };
    const totalCount = await Project.countDocuments(filter);
    const activeCount = await Project.countDocuments({ ...filter, status: 'Active' });
    const plannedCount = await Project.countDocuments({ ...filter, status: 'Planned' });
    const completedCount = await Project.countDocuments({ ...filter, status: 'Completed' });
    const suspendedCount = await Project.countDocuments({ ...filter, status: 'Suspended' });

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

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete project error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};
