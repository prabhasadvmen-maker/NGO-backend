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
// 1. NEWS & BLOGS (BRANCH SCOPED)
// ==========================================

export const getAllBranchNewsPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Admin is scoped strictly to their branch
    const filter = { branch: req.user.branch };

    if (status) filter.status = status;
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
    return res.status(500).json({ success: false, message: 'Failed to get branch news', error: err.message });
  }
};

export const createBranchNewsPost = async (req, res) => {
  try {
    const { title, content, coverImage, category, status } = req.body;
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
      branch: req.user.branch, // Enforced
      createdBy: req.user.id
    });

    await newsPost.save();
    return res.status(201).json({ success: true, message: 'Branch news article created', data: newsPost });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create branch article', error: err.message });
  }
};

export const updateBranchNewsPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, coverImage, category, status } = req.body;

    const newsPost = await NewsPost.findOne({ _id: id, branch: req.user.branch });
    if (!newsPost) {
      return res.status(404).json({ success: false, message: 'Article not found or access denied' });
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

    await newsPost.save();
    return res.status(200).json({ success: true, message: 'Branch article updated', data: newsPost });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update branch article', error: err.message });
  }
};

export const deleteBranchNewsPost = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NewsPost.findOneAndDelete({ _id: id, branch: req.user.branch });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Article not found or access denied' });
    }
    return res.status(200).json({ success: true, message: 'Branch article deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete branch article', error: err.message });
  }
};

// ==========================================
// 2. GALLERY (BRANCH SCOPED)
// ==========================================

export const getAllBranchGalleryItems = async (req, res) => {
  try {
    const { page = 1, limit = 12, category = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { branch: req.user.branch };

    if (category) filter.category = category;

    const [items, total] = await Promise.all([
      GalleryItem.find(filter)
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
    return res.status(500).json({ success: false, message: 'Failed to fetch branch gallery items', error: err.message });
  }
};

export const createBranchGalleryItem = async (req, res) => {
  try {
    const { imageUrl, caption, category } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    const item = new GalleryItem({
      imageUrl,
      caption: caption || '',
      category: category || 'General',
      branch: req.user.branch, // Enforced
      uploadedBy: req.user.id
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Branch gallery item uploaded', data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to upload branch gallery item', error: err.message });
  }
};

export const deleteBranchGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await GalleryItem.findOneAndDelete({ _id: id, branch: req.user.branch });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Gallery item not found or access denied' });
    }
    return res.status(200).json({ success: true, message: 'Branch gallery item deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete branch gallery item', error: err.message });
  }
};

// ==========================================
// 3. TESTIMONIALS (BRANCH SCOPED)
// ==========================================

export const getAllBranchTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { branch: req.user.branch };

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
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

export const createBranchTestimonial = async (req, res) => {
  try {
    const { name, role, message, avatar } = req.body;
    if (!name || !role || !message) {
      return res.status(400).json({ success: false, message: 'Name, role, and message are required' });
    }

    const testimonial = new Testimonial({
      name,
      role,
      message,
      avatar: avatar || '',
      branch: req.user.branch, // Enforced
      isApproved: false // Admin contribution always starts as unapproved pending Super Admin validation
    });

    await testimonial.save();
    return res.status(201).json({ success: true, message: 'Testimonial submitted and pending Super Admin approval', data: testimonial });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create testimonial', error: err.message });
  }
};

// ==========================================
// 4. CONTACT QUERIES INBOX (BRANCH SCOPED)
// ==========================================

export const getAllBranchContactQueries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { branch: req.user.branch };

    if (status) filter.status = status;

    const [queries, total] = await Promise.all([
      ContactQuery.find(filter)
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
    return res.status(500).json({ success: false, message: 'Failed to load branch queries', error: err.message });
  }
};

export const updateBranchContactQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const query = await ContactQuery.findOne({ _id: id, branch: req.user.branch });
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found or access denied' });
    }

    if (status) query.status = status;
    if (notes !== undefined) query.notes = notes;

    await query.save();
    return res.status(200).json({ success: true, message: 'Branch query status updated', data: query });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update branch query', error: err.message });
  }
};
