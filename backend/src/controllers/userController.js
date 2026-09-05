const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { validateEmail, validatePassword } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * List all users with search, role filter, and pagination
 */
const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && ['ADMIN', 'INVESTIGATOR', 'USER'].includes(role.toUpperCase())) {
      query.role = role.toUpperCase();
    }

    if (status !== undefined && status !== '') {
      query.isActive = status === 'active' || status === 'true';
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      users,
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
 * Admin creates a user explicitly with designated role
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address.'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const validRole = ['ADMIN', 'INVESTIGATOR', 'USER'].includes(role) ? role : 'USER';

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with email ${cleanEmail} already exists.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: validRole,
      isActive: true
    });

    await newUser.save();

    await logAction({
      user: req.user,
      action: 'ADMIN_CREATED_USER',
      resourceType: 'USER',
      resourceId: String(newUser._id),
      details: { createdEmail: cleanEmail, role: validRole },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `User '${newUser.name}' created with role ${validRole}.`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin updates user role or active status
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent self-demotion or self-deactivation by current Admin
    if (String(user._id) === String(req.user._id) && (isActive === false || (role && role !== 'ADMIN'))) {
      return res.status(400).json({
        success: false,
        message: 'Administrator cannot deactivate or demote their own account.'
      });
    }

    const previousRole = user.role;
    const previousStatus = user.isActive;

    if (name) user.name = name.trim();
    if (role && ['ADMIN', 'INVESTIGATOR', 'USER'].includes(role)) {
      user.role = role;
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    await logAction({
      user: req.user,
      action: 'ADMIN_UPDATED_USER',
      resourceType: 'USER',
      resourceId: String(user._id),
      details: {
        email: user.email,
        previousRole,
        newRole: user.role,
        previousStatus,
        newStatus: user.isActive
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `User '${user.email}' updated successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin deletes a user account
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.'
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    await logAction({
      user: req.user,
      action: 'ADMIN_DELETED_USER',
      resourceType: 'USER',
      resourceId: String(id),
      details: { deletedEmail: user.email },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `User '${user.email}' was successfully removed.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
