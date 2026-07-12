import MembershipType from '../../shared/models/MembershipType.js';

// GET /api/superadmin/membership-types
export const getMembershipTypes = async (req, res) => {
  try {
    const { search = '', isActive } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const membershipTypes = await MembershipType.find(filter)
      .select('-createdBy')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: membershipTypes,
      count: membershipTypes.length,
    });
  } catch (error) {
    console.error('Get membership types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership types',
    });
  }
};

// GET /api/superadmin/membership-types/:id
export const getMembershipTypeById = async (req, res) => {
  try {
    const membershipType = await MembershipType.findById(req.params.id)
      .select('-createdBy')
      .lean();

    if (!membershipType) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found',
      });
    }

    res.json({
      success: true,
      data: membershipType,
    });
  } catch (error) {
    console.error('Get membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch membership type',
    });
  }
};

// POST /api/superadmin/membership-types
export const createMembershipType = async (req, res) => {
  try {
    const { name, description, annualFee, lifetimeFee, benefits, maxUpgrades, validityYears } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Membership type name is required',
      });
    }

    if (annualFee === undefined || lifetimeFee === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Annual fee and lifetime fee are required',
      });
    }

    // Check if membership type already exists
    const existingType = await MembershipType.findOne({ name });
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: `Membership type "${name}" already exists`,
      });
    }

    const membershipType = new MembershipType({
      name,
      description: description || null,
      annualFee: Number(annualFee),
      lifetimeFee: Number(lifetimeFee),
      benefits: Array.isArray(benefits) ? benefits : [],
      maxUpgrades: maxUpgrades ? Number(maxUpgrades) : 0,
      validityYears: validityYears ? Number(validityYears) : 1,
      createdBy: req.user.id,
    });

    await membershipType.save();

    res.status(201).json({
      success: true,
      message: 'Membership type created successfully',
      data: membershipType,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Membership type with this name already exists',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
      });
    }
    console.error('Create membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create membership type',
    });
  }
};

// PUT /api/superadmin/membership-types/:id
export const updateMembershipType = async (req, res) => {
  try {
    const { name, description, annualFee, lifetimeFee, benefits, maxUpgrades, validityYears, isActive } = req.body;

    const membershipType = await MembershipType.findById(req.params.id);
    if (!membershipType) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found',
      });
    }

    // Check if name is being changed and if new name already exists
    if (name && name !== membershipType.name) {
      const existingType = await MembershipType.findOne({ name });
      if (existingType) {
        return res.status(400).json({
          success: false,
          message: `Membership type "${name}" already exists`,
        });
      }
      membershipType.name = name;
    }

    if (description !== undefined) membershipType.description = description || null;
    if (annualFee !== undefined) membershipType.annualFee = Number(annualFee);
    if (lifetimeFee !== undefined) membershipType.lifetimeFee = Number(lifetimeFee);
    if (benefits !== undefined) membershipType.benefits = Array.isArray(benefits) ? benefits : [];
    if (maxUpgrades !== undefined) membershipType.maxUpgrades = Number(maxUpgrades);
    if (validityYears !== undefined) membershipType.validityYears = Number(validityYears);
    if (isActive !== undefined) membershipType.isActive = Boolean(isActive);

    await membershipType.save();

    res.json({
      success: true,
      message: 'Membership type updated successfully',
      data: membershipType,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
      });
    }
    console.error('Update membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update membership type',
    });
  }
};

// DELETE /api/superadmin/membership-types/:id
export const deleteMembershipType = async (req, res) => {
  try {
    const membershipType = await MembershipType.findByIdAndDelete(req.params.id);

    if (!membershipType) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found',
      });
    }

    res.json({
      success: true,
      message: 'Membership type deleted successfully',
    });
  } catch (error) {
    console.error('Delete membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete membership type',
    });
  }
};
