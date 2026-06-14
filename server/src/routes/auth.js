// src/routes/auth.js
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const { User } = require('../models');
const { generateTokens } = require('../utils/helpers');
const { ok, fail }       = require('../utils/helpers');
const { protect }        = require('../middleware/auth');

// ── POST /api/auth/register ────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, role, district, area, city } = req.body;
    if (!name || !email || !phone || !password)
      return fail(res, 'name, email, phone and password are required.');

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists)
      return fail(res, exists.email === email
        ? 'Email already registered.'
        : 'Phone already registered.', 409);

    const user = await User.create({
      name, email, phone,
      passwordHash: password,          // pre-save hook bcrypts this
      role: ['customer','provider'].includes(role) ? role : 'customer',
      location: {
        district: district || '',
        area:     area     || '',
        city:     city     || 'Chennai',
      },
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(201).json({
      success: true,
      message: 'Account created.',
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, location: user.location },
        accessToken,
        refreshToken,
      },
    });
  } catch (e) { next(e); }
});

// ── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return fail(res, 'Email and password are required.');

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user)    return fail(res, 'Invalid email or password.', 401);
    if (!user.isActive) return fail(res, 'Account suspended.', 403);

    const match = await user.isPasswordCorrect(password, user.passwordHash);
    if (!match)   return fail(res, 'Invalid email or password.', 401);

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    ok(res, {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, location: user.location },
      accessToken,
      refreshToken,
    }, 'Login successful.');
  } catch (e) { next(e); }
});

// ── POST /api/auth/refresh-token ───────────────────────────────
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, 'refreshToken is required.');

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken)
      return fail(res, 'Invalid refresh token.', 401);

    const newAccess = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    ok(res, { accessToken: newAccess });
  } catch (e) {
    if (['JsonWebTokenError','TokenExpiredError'].includes(e.name))
      return fail(res, 'Invalid refresh token.', 401);
    next(e);
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────
router.post('/logout', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
    ok(res, null, 'Logged out.');
  } catch (e) { next(e); }
});

// ── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', protect, (req, res) => ok(res, req.user));

// ── PUT /api/auth/me — update own profile ──────────────────────
router.put('/me', protect, async (req, res, next) => {
  try {
    const { name, phone, city, address, district, area, password } = req.body;

    // Phone must stay unique across users
    if (phone && phone !== req.user.phone) {
      const taken = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (taken) return fail(res, 'Phone already in use by another account.', 409);
    }

    // Load the full doc so the pre-save hook can hash a new password
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return fail(res, 'User not found.', 404);

    if (name)     user.name = name;
    if (phone)    user.phone = phone;
    if (city)     user.location.city = city;
    if (address)  user.location.address = address;
    if (district !== undefined) user.location.district = district;
    if (area !== undefined)     user.location.area = area;
    if (password) {
      if (password.length < 6) return fail(res, 'Password must be at least 6 characters.');
      user.passwordHash = password;          // pre-save hook bcrypts this
    }

    await user.save();

    ok(res, {
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, avatar: user.avatar, location: user.location,
    }, 'Profile updated.');
  } catch (e) {
    if (e.code === 11000) return fail(res, 'Phone already in use by another account.', 409);
    next(e);
  }
});

module.exports = router;
