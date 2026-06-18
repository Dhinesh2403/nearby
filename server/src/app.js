// src/app.js
// Express application — middleware, routes, error handler
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes     = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const chatRoutes     = require('./routes/chats');
const categoryRoutes = require('./routes/categories');
const adsRoutes      = require('./routes/ads');
const leadRoutes     = require('./routes/leads');
const uploadRoutes   = require('./routes/uploads');
const { reviewRouter, complaintRouter, notifRouter, adminRouter, settingsRouter } = require('./routes/extras');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  process.env.CLIENT_URL,
  process.env.STAGING_CLIENT_URL,
  process.env.RENDER_CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
}));

// ── BODY PARSING ─────────────────────────────────────────────
// Limit raised to allow base64 image evidence on complaints.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

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
app.use('/api/chats',         chatRoutes);
app.use('/api/reviews',       reviewRouter);
app.use('/api/complaints',    complaintRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/settings',      settingsRouter);
app.use('/api/categories',    categoryRoutes);
app.use('/api/ads',           adsRoutes);
app.use('/api/leads',         leadRoutes);
app.use('/api/uploads',       uploadRoutes);

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
