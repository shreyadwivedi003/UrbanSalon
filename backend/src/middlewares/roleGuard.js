/**
 * Express Middleware factory to guard route access based on explicit User Roles.
 * @param {Array<string>} allowedRoles - Collection of roles allowed to hit the endpoint (e.g. ['admin', 'salon_owner'])
 */
module.exports = (allowedRoles) => {
  return (req, res, next) => {
    // 1. Defensively verify authentication middleware was executed upstream
    if (!req.user || !req.user.role) {
      return res.status(500).json({
        error: {
          message: 'Authorization Guard missing required identity payload. Ensure auth middleware is run first.',
          code: 'GUARD_MISCONFIGURATION'
        }
      });
    }

    // 2. Cross reference current user role against allowed list collection
    const hasPermission = allowedRoles.includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          message: `Access Denied: Your assigned role (${req.user.role}) does not have sufficient privileges to access this operational endpoint.`,
          code: 'FORBIDDEN_INSUFFICIENT_ROLE'
        }
      });
    }

    next(); // Access approved, continue pipeline execution
  };
};