import jwt from 'jsonwebtoken';
import User from '../../shared/models/User.js';

export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    const admin = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive, createdAt: admin.createdAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, message: 'Admin updated', data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findOneAndDelete({ _id: req.params.id, role: 'admin' });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.status(200).json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    admin.isActive = !admin.isActive;
    await admin.save();
    res.status(200).json({
      success: true,
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'}`,
      data: { isActive: admin.isActive },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const loginAsAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (!admin.isActive) return res.status(403).json({ success: false, message: 'Admin account is inactive' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: `Logged in as ${admin.name}`,
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
