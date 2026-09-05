const AuditLog = require('../models/AuditLog');

/**
 * List audit trail logs for Admin security & compliance monitoring
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, resourceType, userEmail, page = 1, limit = 30 } = req.query;
    const query = {};

    if (action) query.action = { $regex: action, $options: 'i' };
    if (resourceType) query.resourceType = resourceType.toUpperCase();
    if (userEmail) query.userEmail = { $regex: userEmail, $options: 'i' };

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs
};
