import express from 'express';
import { verifyToken, verifySuperAdmin } from '../../shared/middleware/auth.js';
import {
  getDepartments,
  getDepartmentStats,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';

const router = express.Router();

// GET /stats -> getDepartmentStats
router.get('/stats', verifyToken, verifySuperAdmin, getDepartmentStats);

// GET / -> getDepartments
router.get('/', verifyToken, verifySuperAdmin, getDepartments);

// POST / -> createDepartment
router.post('/', verifyToken, verifySuperAdmin, createDepartment);

// PUT /:id -> updateDepartment
router.put('/:id', verifyToken, verifySuperAdmin, updateDepartment);

// DELETE /:id -> deleteDepartment
router.delete('/:id', verifyToken, verifySuperAdmin, deleteDepartment);

export default router;
