// src/middleware/auth.js
const jwt  = require('jsonwebtoken');
const { User } = require('../models');
const { fail } = require('../utils/helpers');

// protect — verify JWT, attach req.user
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return fail(res, 'Access denied. No token provided.', 401);

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.userId).select('-passwordHash');

    if (!user || !user.isActive)
      return fail(res, 'User not found or account suspended.', 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return fail(res, 'Token expired. Please login again.', 401);
    if (err.name === 'JsonWebTokenError')
      return fail(res, 'Invalid token.', 401);
    next(err);
  }
};

// authorize — only allow specific roles
// Usage: authorize('admin') or authorize('provider','admin')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return fail(res, `Requires role: ${roles.join(' or ')}`, 403);
  next();
};

module.exports = { protect, authorize };
