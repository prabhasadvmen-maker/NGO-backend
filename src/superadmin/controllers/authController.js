import jwt from 'jsonwebtoken';
import User from '../../shared/models/User.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account is temporarily locked. Please try again later.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }

    if (user.loginAttempts > 0) await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, activeVolunteers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'volunteer', isActive: true }),
    ]);
    res.status(200).json({
      success: true,
      data: { totalNGOs: 0, totalUsers, totalDonations: 0, activeVolunteers },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getRecentRegistrations = async (req, res) => {
  try {
    const registrations = await User.find().sort({ createdAt: -1 }).limit(10).select('-password');
    res.status(200).json({ success: true, data: registrations, total: registrations.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
