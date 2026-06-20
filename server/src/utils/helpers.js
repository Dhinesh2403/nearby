// src/utils/response.js
// Standard API response shapes used by all controllers
const ok    = (res, data, msg = 'Success', status = 200) =>
  res.status(status).json({ success: true, message: msg, data });

const paginated = (res, data, total, page, limit) =>
  res.status(200).json({
    success: true,
    count: data.length,
    data,
    pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
  });

// `code` is an optional machine-readable tag (e.g. ACCOUNT_DEACTIVATED) so the
// client can react to specific failures without string-matching the message.
const fail = (res, msg = 'Error', status = 400, code) =>
  res.status(status).json({ success: false, message: msg, ...(code ? { code } : {}) });


// ─────────────────────────────────────────────────────────────
// src/utils/tokens.js
// JWT access + refresh token helpers
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const generateTokens = (userId) => ({
  accessToken: jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  ),
  refreshToken: jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  ),
});

// ─────────────────────────────────────────────────────────────
// src/utils/notify.js
// Create a Notification record AND push it live to the user's socket
// room so their bell badge + toast update instantly.
// ─────────────────────────────────────────────────────────────
const pushNotify = async (io, userId, { type, title, body, link = '' }) => {
  if (!userId) return;
  try {
    const { Notification } = require('../models');
    await Notification.create({ userId, type, title, body, link });
    if (io) io.notifyUser(userId.toString(), 'notify:new', { type, title, body, link });
  } catch (_) { /* non-fatal */ }
};

module.exports = { ok, paginated, fail, generateTokens, pushNotify };
