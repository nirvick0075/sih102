const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { validateEmail } = require('../utils/validators');
const { logAction } = require('../services/auditService');

/**
 * Unified Login Controller with Auto-Registration for Unknown Emails
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    // CASE 1 & CASE 2: User exists in database
    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated. Please contact the administrator.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        await logAction({
          user: { email: cleanEmail, role: 'UNKNOWN' },
          action: 'LOGIN_FAILED',
          resourceType: 'AUTH',
          details: { reason: 'Incorrect password entered' },
          ipAddress: req.ip
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your email and password.'
        });
      }

      // Existing User Login Successful
      const token = jwt.sign(
        { userId: user._id, role: user.role, email: user.email },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn }
      );

      await logAction({
        user,
        action: 'USER_LOGIN_SUCCESS',
        resourceType: 'AUTH',
        resourceId: String(user._id),
        details: { role: user.role },
        ipAddress: req.ip
      });

      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.name}`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      });
    }

    // CASE 3: Unknown Email -> Automatically create standard USER account
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const defaultName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const newUser = new User({
      name: defaultName,
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      isActive: true
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role, email: newUser.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    await logAction({
      user: newUser,
      action: 'USER_AUTO_REGISTERED',
      resourceType: 'AUTH',
      resourceId: String(newUser._id),
      details: { role: 'USER', autoCreated: true },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'New user account created and authenticated successfully.',
      token,
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
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt
    }
  });
};

module.exports = {
  login,
  getMe
};
