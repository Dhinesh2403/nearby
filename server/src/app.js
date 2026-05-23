// src/app.js
// Express application — middleware, routes, error handler
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes     = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const bookingRoutes  = require('./routes/bookings');
const { reviewRouter, complaintRouter, notifRouter, adminRouter } = require('./routes/extras');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
}));

// ── BODY PARSING ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── RATE LIMITING ─────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Slow down.' },
}));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'NearBy API', env: process.env.NODE_ENV, ts: new Date() })
);

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/providers',     providerRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/reviews',       reviewRouter);
app.use('/api/complaints',    complaintRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/admin',         adminRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` })
);

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────
app.use((err, req, res, next) => {                           // eslint-disable-line no-unused-vars
  const status  = err.statusCode || 500;
  const message = err.message    || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'test') console.error('🔥', err.stack);
  res.status(status).json({ success: false, message });
});

module.exports = app;
