import Certificate from '../../shared/models/Certificate.js';

// GET /api/admin/certificates
export const getCertificates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      role = '',
      myIssuedOnly = 'true'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (myIssuedOnly === 'true') {
      filter.createdBy = req.user.id;
    }
    if (type) filter.type = type;
    if (role) filter.role = role;

    if (search) {
      filter.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { recipientEmail: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } }
      ];
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Certificate.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get certificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
};

// GET /api/admin/certificates/stats
export const getCertificateStats = async (req, res) => {
  try {
    const filter = { createdBy: req.user.id };
    const totalCount = await Certificate.countDocuments(filter);
    const membershipCount = await Certificate.countDocuments({ ...filter, type: 'Membership' });
    const volunteeringCount = await Certificate.countDocuments({ ...filter, type: 'Volunteering' });
    const donationCount = await Certificate.countDocuments({ ...filter, type: 'Donation' });
    const appreciationCount = await Certificate.countDocuments({ ...filter, type: 'Appreciation' });

    res.json({
      success: true,
      data: {
        totalCount,
        membershipCount,
        volunteeringCount,
        donationCount,
        appreciationCount
      }
    });
  } catch (error) {
    console.error('Admin get certificate stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to compile stats' });
  }
};

// POST /api/admin/certificates
export const createCertificate = async (req, res) => {
  try {
    const { recipientName, recipientEmail, role, type, title, description, signatoryName, signatoryTitle } = req.body;

    if (!recipientName || !recipientEmail || !title || !description) {
      return res.status(400).json({ success: false, message: 'Name, email, title, and description are required' });
    }

    const certificate = new Certificate({
      recipientName,
      recipientEmail,
      role,
      type,
      title,
      description,
      signatoryName: signatoryName || undefined,
      signatoryTitle: signatoryTitle || undefined,
      createdBy: req.user.id
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Admin create certificate error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to issue certificate' });
  }
};

// DELETE /api/admin/certificates/:id
export const deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findOneAndDelete({ _id: id, createdBy: req.user.id });

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Certificate deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete certificate' });
  }
};

// PUT /api/admin/certificates/:id
export const updateCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      recipientName, 
      recipientEmail, 
      role, 
      type, 
      title, 
      description, 
      signatoryName, 
      signatoryTitle 
    } = req.body;

    const certificate = await Certificate.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { 
        $set: { 
          recipientName,
          recipientEmail,
          role,
          type,
          title, 
          description, 
          signatoryName, 
          signatoryTitle 
        } 
      },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Admin update certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to update certificate' });
  }
};
