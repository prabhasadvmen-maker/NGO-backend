import express from 'express';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
  completeEnrollment,
  deleteEnrollment,
  getAllCertificates,
  revokeCertificate,
} from '../controllers/courseController.js';

const router = express.Router();

// Apply admin auth middleware
router.use(verifyToken, verifyAdmin);

// Course Management Routes
router.get('/', getAllCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.patch('/:id/toggle', toggleCourseStatus);

// Enrollment Applications Routes
router.get('/enrollments', getAllEnrollments);
router.patch('/enrollments/:id/approve', approveEnrollment);
router.patch('/enrollments/:id/reject', rejectEnrollment);
router.patch('/enrollments/:id/complete', completeEnrollment);
router.delete('/enrollments/:id', deleteEnrollment);

// Certificates Management Routes
router.get('/certificates', getAllCertificates);
router.patch('/certificates/:id/revoke', revokeCertificate);

export default router;
