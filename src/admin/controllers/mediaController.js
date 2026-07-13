import MediaAsset from '../../shared/models/MediaAsset.js';
import { getUploadPresignedUrl, getViewPresignedUrl, deleteObject } from '../../utils/r2.js';

// GET /api/admin/media/upload-url
export const getBranchMediaUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType, category } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
    }

    const key = `media/${category || 'other'}/${Date.now()}_${fileName}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);

    return res.status(200).json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Branch Media upload URL error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// POST /api/admin/media
export const createBranchMediaAsset = async (req, res) => {
  try {
    const { fileName, fileSize, mimeType, key, category } = req.body;
    if (!fileName || !fileSize || !mimeType || !key) {
      return res.status(400).json({ success: false, message: 'Missing required media metadata' });
    }

    const asset = new MediaAsset({
      fileName,
      fileSize,
      mimeType,
      key,
      category: category || 'other',
      branch: req.user.branch, // Enforced
      uploadedBy: req.user.id
    });

    await asset.save();
    return res.status(201).json({ success: true, message: 'Branch media asset cataloged', data: asset });
  } catch (error) {
    console.error('Create branch media asset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save media metadata' });
  }
};

// GET /api/admin/media
export const getAllBranchMediaAssets = async (req, res) => {
  try {
    const { page = 1, limit = 16, category = '', search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Scoped strictly to the admin's branch
    const filter = { branch: req.user.branch };
    if (category) filter.category = category;
    if (search) {
      filter.fileName = { $regex: search, $options: 'i' };
    }

    const [assets, total] = await Promise.all([
      MediaAsset.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      MediaAsset.countDocuments(filter)
    ]);

    // Attach resolved view URL for each asset
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const obj = asset.toObject();
        obj.urlResolved = await getViewPresignedUrl(asset.key);
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: assetsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get branch media assets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve media library' });
  }
};

// DELETE /api/admin/media/:id
export const deleteBranchMediaAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await MediaAsset.findOne({ _id: id, branch: req.user.branch });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found or access denied' });
    }

    // Delete object from Cloudflare R2
    try {
      await deleteObject(asset.key);
    } catch (r2Err) {
      console.error(`Failed to delete branch R2 key ${asset.key}:`, r2Err);
    }

    await MediaAsset.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error) {
    console.error('Delete branch media asset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete media asset' });
  }
};
