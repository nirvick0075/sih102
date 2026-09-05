/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies if authenticated user role is allowed to access endpoint
 */
const authorize = (allowedRoles = []) => {
  if (typeof allowedRoles === 'string') {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role permissions.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Action requires role [${allowedRoles.join(' or ')}]. Your current role is [${req.user.role}].`
      });
    }

    next();
  };
};

module.exports = { authorize };
