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

// firebaseAuth — verify a Firebase ID token and attach the verified phone
// number to the request (7.8). Reusable on any route that must guarantee a
// freshly phone-verified caller. Token is read from `idToken` (body) or a
// `X-Firebase-Token` header.
const { isFirebaseEnabled, verifyIdToken } = require('../config/firebase');

const firebaseAuth = async (req, res, next) => {
  try {
    if (!isFirebaseEnabled())
      return fail(res, 'Phone verification is not configured on the server.', 503);

    const idToken = req.body?.idToken || req.headers['x-firebase-token'];
    if (!idToken) return fail(res, 'Firebase ID token is required.', 401);

    const decoded = await verifyIdToken(idToken);
    if (!decoded?.phone_number)
      return fail(res, 'Token has no verified phone number.', 401);

    req.firebase = decoded;
    req.firebasePhone = decoded.phone_number;
    next();
  } catch (err) {
    return fail(res, 'Invalid or expired verification token.', 401);
  }
};

module.exports = { protect, authorize, firebaseAuth };
