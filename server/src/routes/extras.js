// src/routes/reviews.js
const router = require('express').Router();
const { Review, Booking, Provider, User } = require('../models');
const { ok, fail }           = require('../utils/helpers');
const { protect, authorize } = require('../middleware/auth');

// GET /api/reviews/provider/:id — reviews for a provider
router.get('/provider/:id', async (req, res, next) => {
  try {
    const reviews = await Review.find({ providerId: req.params.id, isVisible: true })
      .populate('customerId', 'name avatar')
      .sort({ createdAt: -1 });
    ok(res, reviews);
  } catch (e) { next(e); }
});

// POST /api/reviews — customer submits after completed booking
router.post('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { bookingId, rating, review, tags } = req.body;
    if (!bookingId || !rating)
      return fail(res, 'bookingId and rating are required.');

    const booking = await Booking.findById(bookingId);
    if (!booking)              return fail(res, 'Booking not found.', 404);
    if (booking.status !== 'completed')
      return fail(res, 'Can only review completed bookings.', 403);
    if (booking.customerId.toString() !== req.user._id.toString())
      return fail(res, 'Not your booking.', 403);

    const exists = await Review.findOne({ bookingId });
    if (exists) return fail(res, 'Review already submitted for this booking.', 409);

    const r = await Review.create({
      bookingId,
      customerId: req.user._id,
      providerId: booking.providerId,
      rating, review: review || '', tags: tags || [],
    });

    // Recalculate provider rating average
    const stats = await Review.aggregate([
      { $match: { providerId: booking.providerId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await Provider.findByIdAndUpdate(booking.providerId, {
        ratingAvg:   parseFloat(stats[0].avg.toFixed(1)),
        ratingCount: stats[0].count,
      });
    }

    res.status(201).json({ success: true, message: 'Review submitted.', data: r });
  } catch (e) { next(e); }
});

// POST /api/reviews/:id/reply — provider replies
router.post('/:id/reply', protect, authorize('provider'), async (req, res, next) => {
  try {
    const r = await Review.findByIdAndUpdate(
      req.params.id, { providerReply: req.body.reply }, { new: true }
    );
    if (!r) return fail(res, 'Review not found.', 404);
    ok(res, r, 'Reply saved.');
  } catch (e) { next(e); }
});

module.exports = router;


// ─────────────────────────────────────────────────────────────
// src/routes/complaints.js
// ─────────────────────────────────────────────────────────────
const complaintRouter = require('express').Router();
const { Complaint }   = require('../models');

complaintRouter.get('/', protect, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { raisedBy: req.user._id };
    const list   = await Complaint.find(filter)
      .populate('raisedBy', 'name')
      .populate('against',  'name')
      .sort({ createdAt: -1 });
    ok(res, list);
  } catch (e) { next(e); }
});

complaintRouter.post('/', protect, async (req, res, next) => {
  try {
    const { against, bookingId, type, description } = req.body;
    if (!against || !type || !description)
      return fail(res, 'against, type and description are required.');
    const c = await Complaint.create({
      raisedBy: req.user._id,
      against, bookingId: bookingId || null,
      type, description,
    });
    res.status(201).json({ success: true, message: 'Complaint submitted.', data: c });
  } catch (e) { next(e); }
});

complaintRouter.put('/:id/resolve', protect, authorize('admin'), async (req, res, next) => {
  try {
    const c = await Complaint.findByIdAndUpdate(req.params.id, {
      status:     'resolved',
      resolution: req.body.resolution || '',
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    }, { new: true });
    if (!c) return fail(res, 'Complaint not found.', 404);
    ok(res, c, 'Complaint resolved.');
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────
// src/routes/notifications.js
// ─────────────────────────────────────────────────────────────
const notifRouter  = require('express').Router();
const { Notification } = require('../models');

notifRouter.get('/', protect, async (req, res, next) => {
  try {
    const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
    ok(res, list);
  } catch (e) { next(e); }
});

notifRouter.put('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    ok(res, null, 'All marked read.');
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────
// src/routes/admin.js
// ─────────────────────────────────────────────────────────────
const adminRouter = require('express').Router();

adminRouter.use(protect, authorize('admin'));

adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const [users, providers, bookings, complaints] = await Promise.all([
      User.countDocuments(),
      Provider.countDocuments({ status: 'active' }),
      Booking.countDocuments(),
      Complaint.countDocuments({ status: 'open' }),
    ]);
    ok(res, { users, activeProviders: providers, bookings, openComplaints: complaints });
  } catch (e) { next(e); }
});

adminRouter.get('/providers/pending', async (req, res, next) => {
  try {
    const list = await Provider.find({ status: 'pending' }).populate('userId', 'name email phone');
    ok(res, list);
  } catch (e) { next(e); }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = search ? {
      $or: [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    ok(res, users);
  } catch (e) { next(e); }
});

adminRouter.put('/users/:id/ban', async (req, res, next) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!u) return fail(res, 'User not found.', 404);
    ok(res, u, 'User banned.');
  } catch (e) { next(e); }
});

module.exports = { reviewRouter: router, complaintRouter, notifRouter, adminRouter };
