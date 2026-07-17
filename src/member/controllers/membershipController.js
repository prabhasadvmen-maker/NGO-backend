import Member from '../../shared/models/Member.js';
import MembershipType from '../../shared/models/MembershipType.js';
import { getViewPresignedUrl } from '../../utils/r2.js';

// GET /api/member/membership
export const getMemberMembership = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id).lean();
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Get current membership type details
    const currentType = await MembershipType.findOne({ name: member.membershipType }).lean();
    
    // Get requested membership type details if exists
    let requestedType = null;
    if (member.requestedMembershipType) {
      requestedType = await MembershipType.findOne({ name: member.requestedMembershipType }).lean();
    }

    // Get photo URL
    const photoUrl = member.profilePhoto ? await getViewPresignedUrl(member.profilePhoto) : null;

    let upgradeReceiptUrl = null;
    if (member.upgradePaymentReceipt) {
      upgradeReceiptUrl = await getViewPresignedUrl(member.upgradePaymentReceipt).catch(() => null);
    }

    res.json({
      success: true,
      data: {
        memberId: member.memberId,
        fullName: member.fullName,
        photoUrl,
        currentMembership: {
          type: member.membershipType,
          fee: currentType?.annualFee || 0,
          benefits: currentType?.benefits || [],
          validityYears: currentType?.validityYears || 1,
          description: currentType?.description || '',
        },
        requestedMembership: requestedType ? {
          type: member.requestedMembershipType,
          fee: requestedType.annualFee,
          benefits: requestedType.benefits,
          validityYears: requestedType.validityYears,
          description: requestedType.description,
        } : null,
        requestStatus: member.requestStatus,
        status: member.status,
        joiningDate: member.joiningDate,
        expiryDate: member.expiryDate,
        upgradePaymentMode: member.upgradePaymentMode,
        upgradeTransactionId: member.upgradeTransactionId,
        upgradeReceiptUrl,
      }
    });
  } catch (error) {
    console.error('Get membership error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch membership details' });
  }
};

// POST /api/member/membership/request-upgrade
export const requestMembershipUpgrade = async (req, res) => {
  try {
    const { requestedType, paymentMode, transactionId, paymentReceipt } = req.body;

    if (!requestedType) {
      return res.status(400).json({ success: false, message: 'Requested membership type is required' });
    }
    if (!paymentMode || !transactionId) {
      return res.status(400).json({ success: false, message: 'Payment mode and reference transaction ID are required' });
    }

    // Validate requested type exists
    const typeExists = await MembershipType.findOne({ name: requestedType, isActive: true });
    if (!typeExists) {
      return res.status(400).json({ success: false, message: 'Invalid membership type' });
    }

    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if already has pending request
    if (member.requestStatus === 'Pending' && member.requestedMembershipType) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a pending membership request. Please wait for admin approval.' 
      });
    }

    // Can't request same type
    if (requestedType === member.membershipType) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have this membership type' 
      });
    }

    // Update member with upgrade request
    member.requestedMembershipType = requestedType;
    member.requestStatus = 'Pending';
    member.upgradePaymentMode = paymentMode;
    member.upgradeTransactionId = transactionId;
    member.upgradePaymentReceipt = paymentReceipt || null;
    await member.save();

    res.json({
      success: true,
      message: 'Membership upgrade request submitted successfully',
      data: {
        currentType: member.membershipType,
        requestedType: member.requestedMembershipType,
        requestStatus: member.requestStatus,
      }
    });
  } catch (error) {
    console.error('Request upgrade error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit upgrade request' });
  }
};

// GET /api/member/membership/requests
export const getMembershipRequests = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id).lean();
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Get request history
    const requestHistory = [];
    
    if (member.requestStatus && member.requestedMembershipType) {
      const requestedType = await MembershipType.findOne({ name: member.requestedMembershipType }).lean();
      requestHistory.push({
        requestedType: member.requestedMembershipType,
        requestStatus: member.requestStatus,
        requestedAt: member.updatedAt,
        fee: requestedType?.annualFee || 0,
      });
    }

    res.json({
      success: true,
      data: {
        requests: requestHistory,
        currentStatus: member.requestStatus,
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};
