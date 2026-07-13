import MediaAsset from '../../shared/models/MediaAsset.js';
import { getUploadPresignedUrl, getViewPresignedUrl, deleteObject } from '../../utils/r2.js';

// GET /api/superadmin/media/upload-url
export const getMediaUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType, category } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
    }

    const key = `media/${category || 'other'}/${Date.now()}_${fileName}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);

    return res.status(200).json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Media upload URL error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// POST /api/superadmin/media
export const createMediaAsset = async (req, res) => {
  try {
    const { fileName, fileSize, mimeType, key, category, branch } = req.body;
    if (!fileName || !fileSize || !mimeType || !key) {
      return res.status(400).json({ success: false, message: 'Missing required media metadata' });
    }

    const asset = new MediaAsset({
      fileName,
      fileSize,
      mimeType,
      key,
      category: category || 'other',
      branch: branch || null,
      uploadedBy: req.user.id
    });

    await asset.save();
    return res.status(201).json({ success: true, message: 'Media asset cataloged successfully', data: asset });
  } catch (error) {
    console.error('Create media asset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save media metadata' });
  }
};

// GET /api/superadmin/media
export const getAllMediaAssets = async (req, res) => {
  try {
    const { page = 1, limit = 16, category = '', search = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = {};
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (search) {
      filter.fileName = { $regex: search, $options: 'i' };
    }

    const [assets, total] = await Promise.all([
      MediaAsset.find(filter)
        .populate('branch', 'name code')
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
    console.error('Get media assets error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve media library' });
  }
};

// DELETE /api/superadmin/media/:id
export const deleteMediaAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await MediaAsset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Delete object from Cloudflare R2
    try {
      await deleteObject(asset.key);
    } catch (r2Err) {
      console.error(`Failed to delete R2 key ${asset.key}:`, r2Err);
    }

    await MediaAsset.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error) {
    console.error('Delete media asset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete media asset' });
  }
};
