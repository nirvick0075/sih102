const AuditLog = require('../models/AuditLog');

/**
 * Records an audit log entry for traceability
 */
const logAction = async ({
  user = null,
  action,
  resourceType,
  resourceId = '',
  details = {},
  ipAddress = '127.0.0.1'
}) => {
  try {
    const entry = new AuditLog({
      userId: user ? (user._id || user.id || user.userId || 'SYSTEM') : 'SYSTEM',
      userEmail: user ? (user.email || 'system@mplad.gov.in') : 'system@mplad.gov.in',
      userRole: user ? (user.role || 'SYSTEM') : 'SYSTEM',
      action,
      resourceType,
      resourceId: String(resourceId || ''),
      details,
      ipAddress: ipAddress || '127.0.0.1',
      timestamp: new Date()
    });
    await entry.save();
    return entry;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
};

module.exports = {
  logAction
};
