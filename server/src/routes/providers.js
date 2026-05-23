// src/routes/providers.js
const router   = require('express').Router();
const { Provider, User } = require('../models');
const { ok, paginated, fail } = require('../utils/helpers');
const { protect, authorize }  = require('../middleware/auth');

// GET /api/providers — browse with filters
router.get('/', async (req, res, next) => {
  try {
    const { category, isOnline, rating, city, page = 1, limit = 12, sort = 'rating' } = req.query;

    const filter = { status: 'active', isVerified: true };
    if (category && category !== 'all') filter.category = category;
    if (isOnline === 'true')            filter.isOnline  = true;
    if (rating)                         filter.ratingAvg = { $gte: +rating };

    const sortMap = { rating: { ratingAvg: -1 }, bookings: { totalBookings: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 } };
    const sortObj = sortMap[sort] || { ratingAvg: -1 };

    let query = Provider.find(filter).populate('userId', 'name avatar location').sort(sortObj);

    // City filter via populated user location
    let all = await query;
    if (city) all = all.filter(p => p.userId?.location?.city?.toLowerCase().includes(city.toLowerCase()));

    const total   = all.length;
    const records = all.slice((page - 1) * limit, page * limit);
    paginated(res, records, total, page, limit);
  } catch (e) { next(e); }
});

// GET /api/providers/nearby — geospatial search
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, km = 10, category } = req.query;
    if (!lat || !lng) return fail(res, 'lat and lng are required.');

    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [+lng, +lat] },
          $maxDistance: km * 1000,
        },
      },
    }).select('_id');

    const userIds = nearbyUsers.map(u => u._id);
    const filter  = { userId: { $in: userIds }, status: 'active', isVerified: true };
    if (category && category !== 'all') filter.category = category;

    const providers = await Provider.find(filter).populate('userId', 'name avatar location');
    ok(res, providers);
  } catch (e) { next(e); }
});

// GET /api/providers/my — own profile (provider)
router.get('/my', protect, authorize('provider'), async (req, res, next) => {
  try {
    const p = await Provider.findOne({ userId: req.user._id }).populate('userId', 'name avatar location');
    if (!p) return fail(res, 'Provider profile not found.', 404);
    ok(res, p);
  } catch (e) { next(e); }
});

// GET /api/providers/:id — single profile
router.get('/:id', async (req, res, next) => {
  try {
    const p = await Provider.findById(req.params.id).populate('userId', 'name avatar location phone email');
    if (!p) return fail(res, 'Provider not found.', 404);
    ok(res, p);
  } catch (e) { next(e); }
});

// POST /api/providers — create profile
router.post('/', protect, authorize('provider'), async (req, res, next) => {
  try {
    const exists = await Provider.findOne({ userId: req.user._id });
    if (exists) return fail(res, 'Provider profile already exists.', 409);
    const p = await Provider.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, message: 'Profile created. Awaiting verification.', data: p });
  } catch (e) { next(e); }
});

// PUT /api/providers/:id — update own profile
router.put('/:id', protect, authorize('provider'), async (req, res, next) => {
  try {
    const p = await Provider.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!p) return fail(res, 'Not found or not authorised.', 404);
    ok(res, p, 'Profile updated.');
  } catch (e) { next(e); }
});

// Admin: PUT /api/providers/:id/status
router.put('/:id/status', protect, authorize('admin'), async (req, res, next) => {
  try {
    const p = await Provider.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, isVerified: req.body.status === 'active' },
      { new: true }
    );
    if (!p) return fail(res, 'Provider not found.', 404);
    ok(res, p, `Provider ${req.body.status}.`);
  } catch (e) { next(e); }
});

module.exports = router;
