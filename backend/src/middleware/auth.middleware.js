const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pawnhub_super_secret_jwt_key_2026';

/**
 * Middleware to authenticate requests via JWT
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Access denied. Authentication token missing or malformed.');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach payload (id, username, role) to request context
    next();
  } catch (error) {
    const err = new Error('Access denied. Invalid or expired token.');
    err.statusCode = 403;
    return next(err);
  }
};

/**
 * Middleware to restrict access based on roles
 * @param {...string} allowedRoles - List of authorized roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Unauthorized.');
      error.statusCode = 401;
      return next(error);
    }

    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      const error = new Error(`Forbidden. Required role: ${allowedRoles.join(' or ')}`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};
