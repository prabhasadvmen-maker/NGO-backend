import AuditLog from '../shared/models/AuditLog.js';

export const logActivity = async (req, action, module, details, payload = null) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userEmail = req.user?.email || 'system-admin@advmen.org';
    const userRole = req.user?.role || 'super_admin';

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await AuditLog.create({
      userId,
      userEmail,
      userRole,
      action,
      module,
      details,
      ipAddress,
      userAgent,
      payload
    });
  } catch (error) {
    console.error('AuditLogger Error:', error);
  }
};
