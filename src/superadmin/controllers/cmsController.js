import CmsConfig from '../../shared/models/CmsConfig.js';
import NewsPost from '../../shared/models/NewsPost.js';
import GalleryItem from '../../shared/models/GalleryItem.js';
import Testimonial from '../../shared/models/Testimonial.js';
import ContactQuery from '../../shared/models/ContactQuery.js';
import { getUploadPresignedUrl, getViewPresignedUrl } from '../../utils/r2.js';

// --- Helper: Resolve image key to viewable presigned URL ---
const resolveImageUrl = async (key) => {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return await getViewPresignedUrl(key);
};

// --- Helper: Generate unique slug from title ---
const generateSlug = async (title) => {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  
  let slug = baseSlug;
  let count = 1;
  while (await NewsPost.findOne({ slug })) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
};

// ==========================================
// 0. GENERATE UPLOAD PRESIGNED URL
// ==========================================

export const getCmsUploadUrl = async (req, res) => {
  try {
    const { fileName, contentType, fileType } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
    }

    const key = `cms/${fileType || 'general'}/${Date.now()}_${fileName}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);

    return res.status(200).json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('CMS Upload URL generation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
};

// ==========================================
// 1. CMS CONFIG / HOMEPAGE SETTINGS
// ==========================================

export const getCmsConfig = async (req, res) => {
  try {
    let config = await CmsConfig.findOne().populate('updatedBy', 'name email');
    if (!config) {
      config = new CmsConfig();
      await config.save();
    }
    
    // Resolve hero image URL
    const configObj = config.toObject();
    configObj.heroImageUrl = await resolveImageUrl(configObj.heroImage);
    
    return res.status(200).json({ success: true, data: configObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error retrieving config', error: err.message });
  }
};

export const updateCmsConfig = async (req, res) => {
  try {
    const { heroTitle, heroSubtitle, heroImage, mission, vision, stats } = req.body;
    let config = await CmsConfig.findOne();
    if (!config) {
      config = new CmsConfig();
    }
    
    if (heroTitle !== undefined) config.heroTitle = heroTitle;
    if (heroSubtitle !== undefined) config.heroSubtitle = heroSubtitle;
    if (heroImage !== undefined) config.heroImage = heroImage;
    if (mission !== undefined) config.mission = mission;
    if (vision !== undefined) config.vision = vision;
    if (stats !== undefined) config.stats = stats;
    
    config.updatedBy = req.user.id;
    await config.save();
    
    const configObj = config.toObject();
    configObj.heroImageUrl = await resolveImageUrl(configObj.heroImage);
    
    return res.status(200).json({ success: true, message: 'CMS Homepage Settings updated', data: configObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update CMS config', error: err.message });
  }
};

// ==========================================
// 2. NEWS & BLOGS CRUD
// ==========================================

export const getAllNewsPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status) filter.status = status;
    if (branch) filter.branch = branch;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const [posts, total] = await Promise.all([
      NewsPost.find(filter)
        .populate('branch', 'name code')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      NewsPost.countDocuments(filter)
    ]);

    // Resolve cover image URLs
    const postsWithUrls = await Promise.all(
      posts.map(async (p) => {
        const obj = p.toObject();
        obj.coverImageUrl = await resolveImageUrl(p.coverImage);
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: postsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get news posts', error: err.message });
  }
};

export const createNewsPost = async (req, res) => {
  try {
    const { title, content, coverImage, category, status, branch } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const slug = await generateSlug(title);
    const newsPost = new NewsPost({
      title,
      slug,
      content,
      coverImage,
      category: category || 'General',
      status: status || 'Draft',
      branch: branch || null,
      createdBy: req.user.id
    });

    await newsPost.save();
    return res.status(201).json({ success: true, message: 'News article created', data: newsPost });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create article', error: err.message });
  }
};

export const updateNewsPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, coverImage, category, status, branch } = req.body;

    const newsPost = await NewsPost.findById(id);
    if (!newsPost) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (title) {
      newsPost.title = title;
      if (title !== newsPost.title) {
        newsPost.slug = await generateSlug(title);
      }
    }
    if (content !== undefined) newsPost.content = content;
    if (coverImage !== undefined) newsPost.coverImage = coverImage;
    if (category !== undefined) newsPost.category = category;
    if (status !== undefined) newsPost.status = status;
    if (branch !== undefined) newsPost.branch = branch || null;

    await newsPost.save();
    return res.status(200).json({ success: true, message: 'Article updated successfully', data: newsPost });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update article', error: err.message });
  }
};

export const deleteNewsPost = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NewsPost.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    return res.status(200).json({ success: true, message: 'Article deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete article', error: err.message });
  }
};

// ==========================================
// 3. GALLERY ITEMS CRUD
// ==========================================

export const getAllGalleryItems = async (req, res) => {
  try {
    const { page = 1, limit = 12, category = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (category) filter.category = category;
    if (branch) filter.branch = branch;

    const [items, total] = await Promise.all([
      GalleryItem.find(filter)
        .populate('branch', 'name code')
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      GalleryItem.countDocuments(filter)
    ]);

    // Resolve gallery image URLs
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const obj = item.toObject();
        obj.imageUrlResolved = await resolveImageUrl(item.imageUrl);
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: itemsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gallery items', error: err.message });
  }
};

export const createGalleryItem = async (req, res) => {
  try {
    const { imageUrl, caption, category, branch } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    const item = new GalleryItem({
      imageUrl,
      caption: caption || '',
      category: category || 'General',
      branch: branch || null,
      uploadedBy: req.user.id
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Gallery item uploaded', data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create gallery item', error: err.message });
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, caption, category, branch } = req.body;
    const item = await GalleryItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Gallery item not found' });
    if (imageUrl !== undefined) item.imageUrl = imageUrl;
    if (caption !== undefined) item.caption = caption;
    if (category !== undefined) item.category = category;
    if (branch !== undefined) item.branch = branch || null;
    await item.save();
    return res.status(200).json({ success: true, message: 'Gallery item updated', data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update gallery item', error: err.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await GalleryItem.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }
    return res.status(200).json({ success: true, message: 'Gallery item deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete gallery item', error: err.message });
  }
};

// ==========================================
// 4. TESTIMONIALS CRUD & MODERATION
// ==========================================

export const getAllTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 10, isApproved = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (isApproved !== '') filter.isApproved = isApproved === 'true';
    if (branch) filter.branch = branch;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .populate('branch', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Testimonial.countDocuments(filter)
    ]);

    // Resolve avatars URLs
    const testimonialsWithUrls = await Promise.all(
      testimonials.map(async (t) => {
        const obj = t.toObject();
        obj.avatarUrlResolved = await resolveImageUrl(t.avatar);
        return obj;
      })
    );

    return res.status(200).json({
      success: true,
      data: testimonialsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch testimonials', error: err.message });
  }
};

export const createTestimonialDirect = async (req, res) => {
  try {
    const { name, role, message, avatar, branch, isApproved } = req.body;
    if (!name || !role || !message) {
      return res.status(400).json({ success: false, message: 'Name, role, and message are required' });
    }

    const testimonial = new Testimonial({
      name,
      role,
      message,
      avatar: avatar || '',
      branch: branch || null,
      isApproved: isApproved !== undefined ? isApproved : false
    });

    await testimonial.save();
    return res.status(201).json({ success: true, message: 'Testimonial record created', data: testimonial });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create testimonial', error: err.message });
  }
};

export const toggleApproveTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    testimonial.isApproved = isApproved;
    await testimonial.save();

    return res.status(200).json({ success: true, message: `Testimonial status set to: ${isApproved ? 'Approved' : 'Pending Approval'}`, data: testimonial });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Testimonial.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    return res.status(200).json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete testimonial', error: err.message });
  }
};

// ==========================================
// 5. CONTACT QUERIES INBOX
// ==========================================

export const getAllContactQueries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', branch = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status) filter.status = status;
    if (branch) filter.branch = branch;

    const [queries, total] = await Promise.all([
      ContactQuery.find(filter)
        .populate('branch', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ContactQuery.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load inbox queries', error: err.message });
  }
};

export const updateContactQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const query = await ContactQuery.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    if (status) query.status = status;
    if (notes !== undefined) query.notes = notes;

    await query.save();
    return res.status(200).json({ success: true, message: 'Query status updated', data: query });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update query status', error: err.message });
  }
};

export const deleteContactQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ContactQuery.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }
    return res.status(200).json({ success: true, message: 'Query deleted from inbox' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete query', error: err.message });
  }
};
