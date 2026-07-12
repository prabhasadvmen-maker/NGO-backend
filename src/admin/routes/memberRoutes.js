import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, verifyAdmin } from '../../shared/middleware/auth.js';
import { getUploadPresignedUrl } from '../../utils/r2.js';
import {
  uploadPhoto,
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  loginAsMember,
  approveMembershipRequest,
  rejectMembershipRequest,
} from '../controllers/memberController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(verifyToken, verifyAdmin);

router.get('/upload-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName and contentType are required' });
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WEBP images are allowed' });
    }
    const ext = fileName.split('.').pop();
    const key = `members/photos/${uuidv4()}.${ext}`;
    const uploadUrl = await getUploadPresignedUrl(key, contentType, 300);
    res.json({ success: true, uploadUrl, key });
  } catch (error) {
    console.error('Upload URL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload URL' });
  }
});

router.post('/upload', upload.single('photo'), uploadPhoto);
router.get('/', getMembers);
router.post('/', createMember);
router.post('/:id/login-as', loginAsMember);
router.post('/:id/approve-request', approveMembershipRequest);
router.post('/:id/reject-request', rejectMembershipRequest);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
