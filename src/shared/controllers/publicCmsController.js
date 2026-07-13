import CmsConfig from '../models/CmsConfig.js';
import NewsPost from '../models/NewsPost.js';
import GalleryItem from '../models/GalleryItem.js';
import Testimonial from '../models/Testimonial.js';
import ContactQuery from '../models/ContactQuery.js';
import { getViewPresignedUrl } from '../../utils/r2.js';

// --- Helper: Resolve image key to viewable presigned URL ---
const resolveImageUrl = async (key) => {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return await getViewPresignedUrl(key);
};

// ==========================================
// PUBLIC CMS READ CONTROLLER
// ==========================================

export const getPublicConfig = async (req, res) => {
  try {
    let config = await CmsConfig.findOne();
    if (!config) {
      config = new CmsConfig();
      await config.save();
    }
    
    const configObj = config.toObject();
    configObj.heroImageUrl = await resolveImageUrl(configObj.heroImage);
    
    return res.status(200).json({ success: true, data: configObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error retrieving config', error: err.message });
  }
};

export const getPublicNews = async (req, res) => {
  try {
    const { limit = 6, category = '' } = req.query;
    const filter = { status: 'Published' };
    
    if (category) filter.category = category;

    const posts = await NewsPost.find(filter)
      .populate('branch', 'name city')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Resolve cover image URLs
    const postsWithUrls = await Promise.all(
      posts.map(async (p) => {
        const obj = p.toObject();
        obj.coverImageUrl = await resolveImageUrl(p.coverImage);
        return obj;
      })
    );

    return res.status(200).json({ success: true, data: postsWithUrls });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public news posts', error: err.message });
  }
};

export const getPublicGallery = async (req, res) => {
  try {
    const { limit = 16, category = '' } = req.query;
    const filter = {};

    if (category) filter.category = category;

    const items = await GalleryItem.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Resolve gallery image URLs
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const obj = item.toObject();
        obj.imageUrlResolved = await resolveImageUrl(item.imageUrl);
        return obj;
      })
    );

    return res.status(200).json({ success: true, data: itemsWithUrls });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gallery', error: err.message });
  }
};

export const getPublicTestimonials = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const filter = { isApproved: true };

    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Resolve avatars URLs
    const testimonialsWithUrls = await Promise.all(
      testimonials.map(async (t) => {
        const obj = t.toObject();
        obj.avatarUrlResolved = await resolveImageUrl(t.avatar);
        return obj;
      })
    );

    return res.status(200).json({ success: true, data: testimonialsWithUrls });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch testimonials', error: err.message });
  }
};

export const submitContactQuery = async (req, res) => {
  try {
    const { name, email, phone, subject, message, branch } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const query = new ContactQuery({
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
      branch: branch || null,
      status: 'Unread'
    });

    await query.save();
    return res.status(201).json({ success: true, message: 'Your inquiry has been submitted. Our team will get back to you shortly!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to submit query', error: err.message });
  }
};
