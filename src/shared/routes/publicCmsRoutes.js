import express from 'express';
import {
  getPublicConfig,
  getPublicNews,
  getPublicGallery,
  getPublicTestimonials,
  submitContactQuery,
  chatbotReply
} from '../controllers/publicCmsController.js';

const router = express.Router();

// Public anonymous routes
router.get('/config', getPublicConfig);
router.get('/news', getPublicNews);
router.get('/gallery', getPublicGallery);
router.get('/testimonials', getPublicTestimonials);
router.post('/contact', submitContactQuery);
router.post('/chatbot', chatbotReply);

export default router;
