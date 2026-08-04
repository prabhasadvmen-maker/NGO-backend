import express from 'express';
import { 
  verifyCertificate
} from '../controllers/publicController.js';
import Branch from '../models/Branch.js';

const router = express.Router();

// Document / Certificate verification
router.get('/verify-certificate/:certId', verifyCertificate);

// Public endpoint to get all branches (for volunteer signup)
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .select('_id name code city state')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error('Error fetching public branches:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message,
    });
  }
});

export default router;
