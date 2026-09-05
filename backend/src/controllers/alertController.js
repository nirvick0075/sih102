const Alert = require('../models/Alert');

/**
 * List alerts with status filtering and pagination
 */
const getAlerts = async (req, res, next) => {
  try {
    const { isRead, riskLevel, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (isRead !== undefined && isRead !== '') {
      query.isRead = isRead === 'true';
    }

    if (riskLevel) {
      query.riskLevel = riskLevel.toUpperCase();
    }

    if (search) {
      query.$or = [
        { alertId: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Alert.countDocuments(query),
      Alert.countDocuments({ isRead: false })
    ]);

    res.status(200).json({
      success: true,
      alerts,
      unreadCount,
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

/**
 * Mark a single alert as read
 */
const markAlertAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOneAndUpdate(
      { $or: [{ alertId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.status(200).json({ success: true, message: 'Alert marked as read.', alert });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark all alerts as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  markAlertAsRead,
  markAllAsRead
};
