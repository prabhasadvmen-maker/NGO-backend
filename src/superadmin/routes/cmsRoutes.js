import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getCmsConfig,
  updateCmsConfig,
  getAllNewsPosts,
  createNewsPost,
  updateNewsPost,
  deleteNewsPost,
  getAllGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getAllTestimonials,
  createTestimonialDirect,
  toggleApproveTestimonial,
  deleteTestimonial,
  getAllContactQueries,
  updateContactQuery,
  deleteContactQuery,
  getCmsUploadUrl
} from '../controllers/cmsController.js';

const router = express.Router();

// 0. Upload Presigned URL
router.get('/upload-url', verifyToken, verifySuperAdmin, getCmsUploadUrl);

// 1. Homepage Config Settings
router.get('/config', verifyToken, verifySuperAdmin, getCmsConfig);
router.put('/config', verifyToken, verifySuperAdmin, updateCmsConfig);

// 2. News and Blogs
router.get('/news', verifyToken, verifySuperAdmin, getAllNewsPosts);
router.post('/news', verifyToken, verifySuperAdmin, createNewsPost);
router.put('/news/:id', verifyToken, verifySuperAdmin, updateNewsPost);
router.delete('/news/:id', verifyToken, verifySuperAdmin, deleteNewsPost);

// 3. Gallery Grid
router.get('/gallery', verifyToken, verifySuperAdmin, getAllGalleryItems);
router.post('/gallery', verifyToken, verifySuperAdmin, createGalleryItem);
router.put('/gallery/:id', verifyToken, verifySuperAdmin, updateGalleryItem);
router.delete('/gallery/:id', verifyToken, verifySuperAdmin, deleteGalleryItem);

// 4. Testimonials Moderation
router.get('/testimonials', verifyToken, verifySuperAdmin, getAllTestimonials);
router.post('/testimonials', verifyToken, verifySuperAdmin, createTestimonialDirect);
router.put('/testimonials/:id/approve', verifyToken, verifySuperAdmin, toggleApproveTestimonial);
router.delete('/testimonials/:id', verifyToken, verifySuperAdmin, deleteTestimonial);

// 5. Contact Query Forms Inbox
router.get('/queries', verifyToken, verifySuperAdmin, getAllContactQueries);
router.put('/queries/:id', verifyToken, verifySuperAdmin, updateContactQuery);
router.delete('/queries/:id', verifyToken, verifySuperAdmin, deleteContactQuery);

export default router;
