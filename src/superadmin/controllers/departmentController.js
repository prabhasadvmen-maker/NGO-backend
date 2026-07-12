import Department from '../../shared/models/Department.js';
import Branch from '../../shared/models/Branch.js';

// GET /api/superadmin/departments
// GET /api/departments
export const getDepartments = async (req, res) => {
  try {
    const { search, isActive, branchId } = req.query;
    const filter = {};

    if (search) {
      // Find branches matching search to match branch reference
      const matchingBranches = await Branch.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const branchIds = matchingBranches.map(b => b._id);

      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { branch: { $in: branchIds } },
      ];
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (branchId) {
      filter.branch = branchId;
    }

    const departments = await Department.find(filter)
      .populate('branch', 'name code')
      .populate('departmentHead', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
    });
  }
};

// GET /api/superadmin/departments/stats
// GET /api/departments/stats
export const getDepartmentStats = async (req, res) => {
  try {
    const totalDepartments = await Department.countDocuments();
    const activeDepartments = await Department.countDocuments({ isActive: true });
    const inactiveDepartments = await Department.countDocuments({ isActive: false });

    // Group departments by branch and lookup branch details
    const departmentsByBranch = await Department.aggregate([
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'branches', // collection name for Branch is 'branches'
          localField: '_id',
          foreignField: '_id',
          as: 'branchDetails',
        },
      },
      {
        $unwind: {
          path: '$branchDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          branchName: { $ifNull: ['$branchDetails.name', 'Unknown Branch'] },
          count: 1,
          _id: 0,
        },
      },
    ]);

    const branchesCovered = departmentsByBranch.length;

    res.json({
      success: true,
      data: {
        totalDepartments,
        activeDepartments,
        inactiveDepartments,
        branchesCovered,
        departmentsByBranch,
      },
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department statistics',
    });
  }
};

// POST /api/superadmin/departments
export const createDepartment = async (req, res) => {
  try {
    const { name, code, branch, description, departmentHead, phone, email, isActive } = req.body;

    if (!name || !code || !branch) {
      return res.status(400).json({
        success: false,
        message: 'Name, Code, and Branch are required fields',
      });
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check duplicate code
    const existingDept = await Department.findOne({
      code: { $regex: `^${uppercaseCode}$`, $options: 'i' },
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists',
      });
    }

    const newDept = new Department({
      name,
      code: uppercaseCode,
      branch,
      description: description || null,
      departmentHead: departmentHead || null,
      phone: phone || null,
      email: email || null,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
    });

    await newDept.save();

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: newDept,
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
    });
  }
};

// PUT /api/superadmin/departments/:id
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, branch, description, departmentHead, phone, email, isActive } = req.body;

    if (!name || !branch) {
      return res.status(400).json({
        success: false,
        message: 'Name and Branch are required fields',
      });
    }

    const dept = await Department.findById(id);

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // code field is NOT updatable - ignored as instructed

    dept.name = name;
    dept.branch = branch;
    dept.description = description !== undefined ? description : dept.description;
    dept.departmentHead = departmentHead !== undefined ? (departmentHead || null) : dept.departmentHead;
    dept.phone = phone !== undefined ? phone : dept.phone;
    dept.email = email !== undefined ? email : dept.email;
    dept.isActive = isActive !== undefined ? isActive : dept.isActive;
    dept.updatedBy = req.user.id;

    await dept.save();

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: dept,
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
    });
  }
};

// DELETE /api/superadmin/departments/:id
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const dept = await Department.findByIdAndDelete(id);

    if (!dept) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    res.json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
    });
  }
};
