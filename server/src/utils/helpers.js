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

const fail = (res, msg = 'Error', status = 400) =>
  res.status(status).json({ success: false, message: msg });

const createError = (msg, code = 400) => {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
};


// ─────────────────────────────────────────────────────────────
// src/utils/email.js
// Sends transactional emails via SMTP.
// If SMTP creds are not set, logs to console instead — so local
// development works without any email setup.
// ─────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Return a fake transporter that just logs
    return {
      sendMail: async (opts) => {
        console.log(`\n📧  [DEV EMAIL — would have sent to ${opts.to}]`);
        console.log(`    Subject: ${opts.subject}`);
        console.log(`    Body snippet: ${opts.text || '(html)'}`.slice(0, 120));
        return { messageId: 'dev-mode' };
      },
    };
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  return t.sendMail({
    from: `"NearBy" <${process.env.SMTP_USER || 'no-reply@nearby.local'}>`,
    to, subject, html, text,
  });
};


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

module.exports = { ok, paginated, fail, createError, sendEmail, generateTokens };
