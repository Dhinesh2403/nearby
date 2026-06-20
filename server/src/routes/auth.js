// src/routes/auth.js
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { User, AppSettings } = require('../models');
const crypto = require('crypto');
const { ok, fail, generateTokens, pushNotify } = require('../utils/helpers');
const { protect }        = require('../middleware/auth');
const { isFirebaseEnabled, verifyIdToken } = require('../config/firebase');

// Normalise a Firebase phone number (E.164, e.g. +919876543210) to the
// 10-digit form stored on existing accounts so lookups stay consistent.
const toLocalPhone = (e164 = '') => {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0'))  return digits.slice(1);
  return digits.slice(-10);
};

// Whether phone OTP is required, per admin AppSettings. A single switch
// (otpEnabled) gates verification for all roles. When it is off the
// passwordless /register-direct path is allowed.
const otpRequired = (settings) => !!settings.otpEnabled;

// ── POST /api/auth/check-phone ─────────────────────────────────
// Step 1 of login: check if a phone number has an account and whether
// a password is set, so the frontend knows which flow to show next.
router.post('/check-phone', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return fail(res, 'phone is required.');
    const user = await User.findOne({ phone }).select('hasPassword').lean();
    ok(res, { exists: !!user, hasPassword: !!(user?.hasPassword) });
  } catch (e) { next(e); }
});

// ── POST /api/auth/login-phone ─────────────────────────────────
// Password-based login for users who have already set a password.
router.post('/login-phone', async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return fail(res, 'phone and password are required.');

    const user = await User.findOne({ phone }).select('+passwordHash');
    if (!user)          return fail(res, 'No account found with this number.', 404);
    if (!user.isActive) return fail(res, 'Your account has been deactivated by the admin. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    if (!user.hasPassword) return fail(res, 'Please verify your number to sign in.', 400);

    const match = await user.isPasswordCorrect(password, user.passwordHash);
    if (!match) return fail(res, 'Incorrect password.', 401);

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    ok(res, {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, location: user.location },
      accessToken,
      refreshToken,
    }, 'Login successful.');
  } catch (e) { next(e); }
});

// ── POST /api/auth/firebase-check ──────────────────────────────
// Called after OTP is confirmed on the frontend. Verifies the token and
// tells the client whether this is a new user (needs profile step) or
// an existing user (goes to set-password step).
router.post('/firebase-check', async (req, res, next) => {
  try {
    if (!isFirebaseEnabled())
      return fail(res, 'Phone verification is not configured on the server.', 503);

    const { idToken } = req.body;
    if (!idToken) return fail(res, 'idToken is required.');

    let decoded;
    try { decoded = await verifyIdToken(idToken); }
    catch { return fail(res, 'Invalid or expired verification token.', 401); }

    const phone = toLocalPhone(decoded.phone_number || '');
    if (!phone) return fail(res, 'Token has no verified phone number.', 400);

    const existing = await User.findOne({ phone }).lean();
    ok(res, { isNewUser: !existing });
  } catch (e) { next(e); }
});

// ── POST /api/auth/firebase-verify ─────────────────────────────
// Final OTP step: find-or-create account, apply profile + password for
// new users, or update password for returning users (forgot / first-time set).
router.post('/firebase-verify', async (req, res, next) => {
  try {
    if (!isFirebaseEnabled())
      return fail(res, 'Phone verification is not configured on the server.', 503);

    const { idToken, role, profile, password } = req.body;
    if (!idToken) return fail(res, 'idToken is required.');

    let decoded;
    try { decoded = await verifyIdToken(idToken); }
    catch { return fail(res, 'Invalid or expired verification token.', 401); }

    const e164  = decoded.phone_number;
    if (!e164) return fail(res, 'Token has no verified phone number.', 400);
    const phone = toLocalPhone(e164);

    const newRole = role === 'provider' ? 'provider' : 'customer';

    let user = await User.findOne({ phone }).select('+passwordHash');

    if (!user) {
      // New user — check provider registration gate
      if (newRole === 'provider') {
        const settings = await AppSettings.getSingleton();
        if (!settings.registrationsEnabled)
          return fail(res, 'New provider registrations are temporarily closed.', 403);
      }

      const name  = profile?.name?.trim()  || `User ${phone.slice(-4)}`;
      const email = profile?.email?.trim() || `${phone}@phone.nearby`;
      const city  = profile?.city?.trim()  || '';

      user = await User.create({
        name,
        email,
        phone,
        passwordHash: password || crypto.randomBytes(24).toString('hex'),
        hasPassword:  !!password,
        role: newRole,
        location: { city, area: city, district: city },
      });
    } else {
      // Returning user — update password and/or profile fields if provided
      let changed = false;

      if (profile?.name?.trim()  && user.name.startsWith('User '))          { user.name = profile.name.trim(); changed = true; }
      if (profile?.email?.trim() && user.email.endsWith('@phone.nearby'))   { user.email = profile.email.trim(); changed = true; }
      if (profile?.city?.trim())                                             { user.location.city = profile.city.trim(); changed = true; }
      if (password) { user.passwordHash = password; user.hasPassword = true; changed = true; }

      if (changed) await user.save();
    }

    if (!user.isActive) return fail(res, 'Your account has been deactivated by the admin. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    await pushNotify(req.app.locals.io, user._id, {
      type:  'account',
      title: 'Phone verified ✓',
      body:  'Your number is verified. You can now contact providers directly.',
      link:  '/',
    });

    const fresh = await User.findById(user._id).lean();
    ok(res, {
      user: { _id: fresh._id, name: fresh.name, email: fresh.email, role: fresh.role, avatar: fresh.avatar, location: fresh.location },
      accessToken,
      refreshToken,
    }, 'Phone verified.');
  } catch (e) { next(e); }
});

// ── POST /api/auth/register-direct ─────────────────────────────
// Passwordless sign-up / first-time password set used ONLY when phone OTP is
// disabled for the role (admin Settings → OTP Verification off). Mirrors the
// find-or-create logic of firebase-verify but skips Firebase entirely.
// Security: the server re-checks the OTP toggle so this can never be used to
// bypass verification while OTP is on, and refuses numbers that already have a
// password (those must sign in normally).
router.post('/register-direct', async (req, res, next) => {
  try {
    const { phone: rawPhone, role, profile, password, reset } = req.body;
    const phone = toLocalPhone(rawPhone || '');
    if (!/^\d{10}$/.test(phone))        return fail(res, 'A valid 10-digit phone number is required.');
    if (!password || password.length < 6) return fail(res, 'Password must be at least 6 characters.');

    const newRole  = role === 'provider' ? 'provider' : 'customer';
    const settings = await AppSettings.getSingleton();

    // Hard gate — if OTP is on, this passwordless path is not allowed.
    if (otpRequired(settings))
      return fail(res, 'Phone verification is required for this number.', 403);

    let user = await User.findOne({ phone }).select('+passwordHash');

    // An existing password normally means "please sign in" — except for an
    // explicit forgot-password reset, allowed here only because OTP is off
    // (re-checked above), so there is no separate verification step.
    if (user && user.hasPassword && !reset)
      return fail(res, 'This number already has a password. Please sign in.', 409);

    if (!user) {
      if (newRole === 'provider' && !settings.registrationsEnabled)
        return fail(res, 'New provider registrations are temporarily closed.', 403);

      const name  = profile?.name?.trim()  || `User ${phone.slice(-4)}`;
      const email = profile?.email?.trim() || `${phone}@phone.nearby`;
      const city  = profile?.city?.trim()  || '';

      user = await User.create({
        name, email, phone,
        passwordHash: password,
        hasPassword:  true,
        role: newRole,
        location: { city, area: city, district: city },
      });
    } else {
      // Existing account: first-time password set, or a forgot-password reset
      // (reset=true) — apply the new password now (+ any profile updates).
      if (profile?.name?.trim()  && user.name.startsWith('User '))        user.name = profile.name.trim();
      if (profile?.email?.trim() && user.email.endsWith('@phone.nearby')) user.email = profile.email.trim();
      if (profile?.city?.trim())                                          user.location.city = profile.city.trim();
      user.passwordHash = password;
      user.hasPassword  = true;
      await user.save();
    }

    if (!user.isActive) return fail(res, 'Your account has been deactivated by the admin. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    const fresh = await User.findById(user._id).lean();
    ok(res, {
      user: { _id: fresh._id, name: fresh.name, email: fresh.email, role: fresh.role, avatar: fresh.avatar, location: fresh.location },
      accessToken,
      refreshToken,
    }, 'Welcome to NearBy.');
  } catch (e) {
    if (e.code === 11000) return fail(res, 'An account with this number already exists.', 409);
    next(e);
  }
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
    // A deactivated account must not be able to mint a fresh access token.
    if (!user.isActive)
      return fail(res, 'Your account has been deactivated by the admin.', 403, 'ACCOUNT_DEACTIVATED');

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

    if (phone && phone !== req.user.phone) {
      const taken = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (taken) return fail(res, 'Phone already in use by another account.', 409);
    }

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
      user.passwordHash = password;
      user.hasPassword  = true;
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
