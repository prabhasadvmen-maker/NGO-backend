import Certificate from '../models/Certificate.js';

// GET /api/public/verify-certificate/:certId
export const verifyCertificate = async (req, res) => {
  try {
    const { certId } = req.params;

    // Search by certificateId or cryptographic hash
    const certificate = await Certificate.findOne({
      $or: [
        { certificateId: certId.toUpperCase() },
        { hash: certId }
      ]
    })
    .populate('createdBy', 'name')
    .lean();

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found. This document cannot be verified as authentic.'
      });
    }

    res.json({
      success: true,
      message: 'Certificate verified authentic',
      data: {
        certificateId: certificate.certificateId,
        recipientName: certificate.recipientName,
        recipientEmail: certificate.recipientEmail,
        role: certificate.role,
        type: certificate.type,
        issueDate: certificate.issueDate,
        title: certificate.title,
        description: certificate.description,
        signatoryName: certificate.signatoryName,
        signatoryTitle: certificate.signatoryTitle,
        hash: certificate.hash,
        issuedBy: certificate.createdBy?.name || 'Advmen NGO Office'
      }
    });
  } catch (error) {
    console.error('Public certificate verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification' });
  }
};
