import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const verifySuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only super admin can access this resource' });
  }
  next();
};

export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

export const verifyMember = (req, res, next) => {
  if (req.user?.role !== 'member') {
    return res.status(403).json({ success: false, message: 'Member access required' });
  }
  next();
};
