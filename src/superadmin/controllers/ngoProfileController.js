import NgoProfile from '../../shared/models/NgoProfile.js';
import { getUploadPresignedUrl, getViewPresignedUrl } from '../../utils/r2.js';
import { v4 as uuidv4 } from 'uuid';

// GET /api/superadmin/ngo-profile
// Accessible to Super Admin and Admin
export const getNgoProfile = async (req, res) => {
  try {
    let profile = await NgoProfile.findOne().lean();

    if (!profile) {
      return res.json({
        success: true,
        data: null,
        message: 'NGO profile not created yet',
      });
    }

    // Generate presigned view URLs for media assets
    if (profile.logo) {
      profile.logoUrl = await getViewPresignedUrl(profile.logo);
    }
    if (profile.signature) {
      profile.signatureUrl = await getViewPresignedUrl(profile.signature);
    }
    if (profile.seal) {
      profile.sealUrl = await getViewPresignedUrl(profile.seal);
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Get NGO Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NGO Profile',
    });
  }
};

// PUT /api/superadmin/ngo-profile
// Upsert (Create or Update) the single NGO Profile
// Accessible only to Super Admin
export const updateNgoProfile = async (req, res) => {
  try {
    const {
      name,
      registrationNumber,
      registrationDate,
      panNumber,
      tanNumber,
      contactNumber,
      email,
      website,
      address,
      city,
      state,
      district,
      pinCode,
      about,
      mission,
      vision,
      logo,
      signature,
      seal,
      taxStatus,
    } = req.body;

    // Basic Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'NGO Name is required',
      });
    }
    if (!contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone number is required',
      });
    }
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Primary email address is required',
      });
    }

    let profile = await NgoProfile.findOne();

    if (!profile) {
      // Create new profile
      profile = new NgoProfile({
        name,
        registrationNumber,
        registrationDate: registrationDate || null,
        panNumber,
        tanNumber,
        contactNumber,
        email,
        website,
        address,
        city,
        state,
        district,
        pinCode,
        about,
        mission,
        vision,
        logo: logo || null,
        signature: signature || null,
        seal: seal || null,
        taxStatus: taxStatus || {},
        createdBy: req.user.id,
      });
    } else {
      // Update existing profile
      profile.name = name;
      profile.registrationNumber = registrationNumber || null;
      profile.registrationDate = registrationDate || null;
      profile.panNumber = panNumber || null;
      profile.tanNumber = tanNumber || null;
      profile.contactNumber = contactNumber;
      profile.email = email;
      profile.website = website || null;
      profile.address = address || null;
      profile.city = city || null;
      profile.state = state || null;
      profile.district = district || null;
      profile.pinCode = pinCode || null;
      profile.about = about || null;
      profile.mission = mission || null;
      profile.vision = vision || null;
      if (logo !== undefined) profile.logo = logo || null;
      if (signature !== undefined) profile.signature = signature || null;
      if (seal !== undefined) profile.seal = seal || null;
      if (taxStatus !== undefined) profile.taxStatus = taxStatus;
      profile.updatedBy = req.user.id;
    }

    await profile.save();

    // Attach pre-signed view URLs for the saved profile
    const profileObject = profile.toObject();
    if (profileObject.logo) profileObject.logoUrl = await getViewPresignedUrl(profileObject.logo);
    if (profileObject.signature) profileObject.signatureUrl = await getViewPresignedUrl(profileObject.signature);
    if (profileObject.seal) profileObject.sealUrl = await getViewPresignedUrl(profileObject.seal);

    res.json({
      success: true,
      message: 'NGO Profile saved successfully',
      data: profileObject,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Update NGO Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save NGO Profile details',
    });
  }
};

// GET /api/superadmin/ngo-profile/upload-url
// Get a presigned upload URL for assets (logo, signature, seal)
// Accessible only to Super Admin
export const getNgoProfileUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType, fileType } = req.query; // fileType can be 'logo', 'signature', or 'seal'

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'fileName and contentType are required query parameters',
      });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG, PNG, or WEBP image uploads are allowed',
      });
    }

    const type = fileType || 'logo';
    const ext = fileName.split('.').pop();
    const key = `ngo-profile/${type}/${uuidv4()}.${ext}`;

    const uploadUrl = await getUploadPresignedUrl(key, contentType);

    res.json({
      success: true,
      uploadUrl,
      key,
      message: 'Presigned upload URL generated successfully',
    });
  } catch (error) {
    console.error('NGO Profile upload URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload URL',
    });
  }
};
