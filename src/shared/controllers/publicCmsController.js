import CmsConfig from '../models/CmsConfig.js';
import NewsPost from '../models/NewsPost.js';
import GalleryItem from '../models/GalleryItem.js';
import Testimonial from '../models/Testimonial.js';
import ContactQuery from '../models/ContactQuery.js';
import { getViewPresignedUrl } from '../../utils/r2.js';
import Groq from 'groq-sdk';

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
    
    if (configObj.heroBannerImages && configObj.heroBannerImages.length > 0) {
      configObj.heroBannerImages = await Promise.all(
        configObj.heroBannerImages.map(async (img) => ({
          ...img,
          imageUrlResolved: await resolveImageUrl(img.imageUrl)
        }))
      );
    }
    
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

const SYSTEM_PROMPT_TEMPLATE = (contactPhone, contactEmail) => `You are the official AI assistant for SAVITRAM FOUNDATION, a registered non-governmental organization (NGO) in India. You help website visitors with information about the NGO.

Key facts about SAVITRAM FOUNDATION:
- Registered NGO in India, operating since 2018
- Works in 6 sectors: Education, Healthcare, Women Empowerment, Child Welfare, Environment, Community Development
- Has impacted 12,500+ lives, 450+ volunteers, 35+ projects completed
- Section 80G tax exempt — donations are tax deductible
- Contact: ${contactPhone} | ${contactEmail}
- Membership tiers: Bronze (₹1,000/yr), Silver (₹5,000/yr), Gold (₹15,000/yr), Platinum (₹50,000/yr)
- Volunteer applications: /volunteer page
- Donate: /crowdfunding page
- Membership: /membership page
- Verify certificates: /verify page

Always be helpful, warm, and concise. Answer only questions related to the NGO. For unrelated topics, politely redirect to NGO matters. Keep responses under 3 sentences.`;

export const chatbotReply = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, message: 'Chatbot service unavailable. Contact +91 83750 08009.' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let config = await CmsConfig.findOne();
    if (!config) {
      config = new CmsConfig();
      await config.save();
    }
    const contactPhone = config.contactPhone || '+91 83750 08009';
    const contactEmail = config.contactEmail || 'hello@advmen.com';

    const SYSTEM_PROMPT = SYSTEM_PROMPT_TEMPLATE(contactPhone, contactEmail);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6).map(h => ({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text })),
      { role: 'user', content: message.trim() }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages,
      max_tokens: 200,
      temperature: 0.6
    });

    const reply = completion.choices[0]?.message?.content?.trim() || `I am unable to respond right now. Please contact us at ${contactPhone}.`;
    return res.status(200).json({ success: true, data: { reply } });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    return res.status(500).json({ success: false, message: 'Chatbot unavailable. Please try again later.' });
  }
};
