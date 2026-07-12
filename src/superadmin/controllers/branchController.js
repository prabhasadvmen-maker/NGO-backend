import Branch from '../../shared/models/Branch.js';
import Member from '../../shared/models/Member.js';

// GET /api/superadmin/branches
// GET /api/branches
export const getAllBranches = async (req, res) => {
  try {
    const { search, isActive, state } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (state) {
      filter.state = { $regex: `^${state}$`, $options: 'i' };
    }

    const branches = await Branch.find(filter)
      .populate('branchHead', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error('Get all branches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
    });
  }
};

// GET /api/superadmin/branches/:id
export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id).populate('branchHead', 'name email role');

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error('Get branch by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch details',
    });
  }
};

// POST /api/superadmin/branches
export const createBranch = async (req, res) => {
  try {
    const {
      name,
      code,
      establishedDate,
      address,
      city,
      district,
      state,
      pinCode,
      phone,
      email,
      branchHead,
      isActive,
    } = req.body;

    // Validation
    if (!name || !code || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'Name, Code, City, and State are required fields',
      });
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check duplicate code
    const existingBranch = await Branch.findOne({
      code: { $regex: `^${uppercaseCode}$`, $options: 'i' },
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: `Branch code '${uppercaseCode}' is already in use`,
      });
    }

    const branch = new Branch({
      name,
      code: uppercaseCode,
      establishedDate: establishedDate || null,
      address: address || null,
      city,
      district: district || null,
      state,
      pinCode: pinCode || null,
      phone: phone || null,
      email: email || null,
      branchHead: branchHead || null,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
    });

    await branch.save();

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch,
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch',
    });
  }
};

// PUT /api/superadmin/branches/:id
export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      establishedDate,
      address,
      city,
      district,
      state,
      pinCode,
      phone,
      email,
      branchHead,
      isActive,
    } = req.body;

    // Validation
    if (!name || !code || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'Name, Code, City, and State are required fields',
      });
    }

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check duplicate code excluding current branch
    const existingBranch = await Branch.findOne({
      code: { $regex: `^${uppercaseCode}$`, $options: 'i' },
      _id: { $ne: id },
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: `Branch code '${uppercaseCode}' is already in use by another branch`,
      });
    }

    branch.name = name;
    branch.code = uppercaseCode;
    branch.establishedDate = establishedDate || null;
    branch.address = address || null;
    branch.city = city;
    branch.district = district || null;
    branch.state = state;
    branch.pinCode = pinCode || null;
    branch.phone = phone || null;
    branch.email = email || null;
    branch.branchHead = branchHead || null;
    if (isActive !== undefined) branch.isActive = isActive;
    branch.updatedBy = req.user.id;

    await branch.save();

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch,
    });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branch details',
    });
  }
};

// DELETE /api/superadmin/branches/:id
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found',
      });
    }

    // Check if the branch has associated members in Member model
    const hasMembers = await Member.countDocuments({ branch: id });

    if (hasMembers > 0) {
      // Soft approach: Deactivate instead of deleting
      branch.isActive = false;
      branch.updatedBy = req.user.id;
      await branch.save();

      return res.json({
        success: true,
        message: 'Branch has associated members. Deactivated the branch instead of deletion.',
        data: branch,
        softDeleted: true,
      });
    }

    // Hard delete if no members exist
    await Branch.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Branch deleted successfully',
      softDeleted: false,
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
    });
  }
};

// GET /api/superadmin/branches/stats
export const getBranchStats = async (req, res) => {
  try {
    const totalBranches = await Branch.countDocuments();
    const activeBranches = await Branch.countDocuments({ isActive: true });
    const inactiveBranches = await Branch.countDocuments({ isActive: false });

    // Branches by state aggregation
    const stateStats = await Branch.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          state: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    const statesCovered = stateStats.length;

    res.json({
      success: true,
      data: {
        totalBranches,
        activeBranches,
        inactiveBranches,
        statesCovered,
        branchesByState: stateStats,
      },
    });
  } catch (error) {
    console.error('Get branch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch statistics',
    });
  }
};
