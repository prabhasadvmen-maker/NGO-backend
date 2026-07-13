import express from 'express';
import {
  getPublicConfig,
  getPublicNews,
  getPublicGallery,
  getPublicTestimonials,
  submitContactQuery
} from '../controllers/publicCmsController.js';

const router = express.Router();

// Public anonymous routes
router.get('/config', getPublicConfig);
router.get('/news', getPublicNews);
router.get('/gallery', getPublicGallery);
router.get('/testimonials', getPublicTestimonials);
router.post('/contact', submitContactQuery);

export default router;
