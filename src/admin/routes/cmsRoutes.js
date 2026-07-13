import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllBranchNewsPosts,
  createBranchNewsPost,
  updateBranchNewsPost,
  deleteBranchNewsPost,
  getAllBranchGalleryItems,
  createBranchGalleryItem,
  deleteBranchGalleryItem,
  getAllBranchTestimonials,
  createBranchTestimonial,
  getAllBranchContactQueries,
  updateBranchContactQuery,
  getCmsUploadUrl
} from '../controllers/cmsController.js';

const router = express.Router();

// All routes require token verification and Admin or Super Admin verification
router.use(verifyToken, verifyAdmin);

// 0. Upload URL
router.get('/upload-url', getCmsUploadUrl);

// 1. Branch News / Blogs
router.get('/news', getAllBranchNewsPosts);
router.post('/news', createBranchNewsPost);
router.put('/news/:id', updateBranchNewsPost);
router.delete('/news/:id', deleteBranchNewsPost);

// 2. Branch Gallery items
router.get('/gallery', getAllBranchGalleryItems);
router.post('/gallery', createBranchGalleryItem);
router.delete('/gallery/:id', deleteBranchGalleryItem);

// 3. Branch Testimonials submissions
router.get('/testimonials', getAllBranchTestimonials);
router.post('/testimonials', createBranchTestimonial);

// 4. Contact inquiries routed to branch
router.get('/queries', getAllBranchContactQueries);
router.put('/queries/:id', updateBranchContactQuery);

export default router;
