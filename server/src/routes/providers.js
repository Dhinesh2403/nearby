// src/routes/providers.js
const router   = require('express').Router();
const { Provider, User, ContactLog, ProfileView, Review, AdReward, AppSettings, Category, SavedProvider } = require('../models');
const { ok, paginated, fail, pushNotify } = require('../utils/helpers');
const { protect, authorize }  = require('../middleware/auth');

// Category is no longer a fixed schema enum — validate it against the live,
// admin-managed Category list. Returns an error string, or '' when valid.
const invalidCategory = async (category) => {
  if (!category) return 'Please choose a category.';
  if (category === '__other__') return 'Pick a category, or request a new one first.';
  const exists = await Category.exists({ slug: category, isActive: true });
  return exists ? '' : 'That category is not available. Please choose another.';
};

// How many rewarded ads must be watched to unlock the visitor list —
// admin-configurable via AppSettings (5.12), default 2.
const adsRequired = async () => (await AppSettings.getSingleton()).adsRequiredCount ?? 2;

// Whether the admin has the "Who Visited" feature switched on (5.12).
const whoVisitedEnabled = async () => (await AppSettings.getSingleton()).whoVisitedEnabled !== false;

// Start of the rolling "this week" window (today + previous 6 days, at midnight).
// Used for both the visitor count and the ad-unlock state so they always agree.
const weekStart = () => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - 6);
  return d;
};

// Single source of truth for a provider's visitor-list unlock state this week.
// A batch is unlocked once `required` rewarded ads watched this week have been
// consumed (unlockedVisitorBatch:true). `pending` is progress toward the next
// unlock. The teaser and the visitor list both read this so they never disagree.
const visitorUnlockState = async (providerId) => {
  const required = await adsRequired();
  const since    = weekStart();
  const [pending, consumed] = await Promise.all([
    AdReward.countDocuments({ providerId, unlockedVisitorBatch: false, createdAt: { $gte: since } }),
    AdReward.countDocuments({ providerId, unlockedVisitorBatch: true,  createdAt: { $gte: since } }),
  ]);
  const unlocked = consumed >= required;
  return { required, since, pending, unlocked, adsWatched: unlocked ? required : pending };
};

// Compute a provider's profile-completion percentage from filled fields.
const completionPct = (p) => {
  const checks = [
    !!p.businessName, !!p.tagline, !!p.bio, !!p.category, !!p.subCategory,
    (p.skills?.length || 0) > 0, (p.images?.length || 0) > 0,
    p.price > 0, p.experience > 0, (p.availability?.days?.length || 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

// GET /api/providers — browse with filters + keyword search (7.10)
router.get('/', async (req, res, next) => {
  try {
    const { category, isOnline, rating, city, district, search, page = 1, limit = 12, sort = 'rating' } = req.query;

    const filter = { status: 'active', isVerified: true };
    if (category && category !== 'all') filter.category = category;
    if (isOnline === 'true')            filter.isOnline  = true;
    if (rating)                         filter.ratingAvg = { $gte: +rating };

    // Fuzzy keyword search across business name, sub-category, skills and bio.
    if (search && search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // escape regex
      const rx   = new RegExp(safe, 'i');
      filter.$or = [
        { businessName: rx },
        { subCategory:  rx },
        { skills:       rx },   // matches any element of the skills array
        { bio:          rx },
        { tagline:      rx },
      ];
    }

    const sortMap = { rating: { ratingAvg: -1 }, popular: { ratingCount: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 } };
    const sortObj = sortMap[sort] || { ratingAvg: -1 };

    let query = Provider.find(filter).populate('userId', 'name avatar location isDemo').sort(sortObj);

    let all = await query;

    // Never surface demo (internal test) accounts to real users.
    all = all.filter(p => !p.userId?.isDemo);

    // District is the primary medium for offline services: only providers in the
    // same district are shown, EXCEPT online providers who can serve any district.
    if (district) {
      const d = district.toLowerCase();
      all = all.filter(p => p.isOnline || (p.userId?.location?.district || '').toLowerCase() === d);
    }

    // City filter via populated user location
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
      isDemo: { $ne: true },
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

// GET /api/providers/my/stats — dashboard metrics for the logged-in provider
router.get('/my/stats', protect, authorize('provider'), async (req, res, next) => {
  try {
    const p = await Provider.findOne({ userId: req.user._id });
    if (!p) return fail(res, 'Provider profile not found.', 404);

    const now        = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startWeek  = new Date(startToday); startWeek.setDate(startWeek.getDate() - 6);

    const [viewsAll, viewsWeek, viewsToday, contactsAll, contactsWeek] = await Promise.all([
      ProfileView.countDocuments({ providerId: p._id }),
      ProfileView.countDocuments({ providerId: p._id, createdAt: { $gte: startWeek } }),
      ProfileView.countDocuments({ providerId: p._id, createdAt: { $gte: startToday } }),
      ContactLog.countDocuments({ providerId: p._id }),
      ContactLog.countDocuments({ providerId: p._id, createdAt: { $gte: startWeek } }),
    ]);

    ok(res, {
      views:    { today: viewsToday, week: viewsWeek, all: viewsAll },
      contacts: { week: contactsWeek, all: contactsAll },
      rating:   { avg: p.ratingAvg, count: p.ratingCount },
      completion: completionPct(p),
    });
  } catch (e) { next(e); }
});

// GET /api/providers/my/visitors/teaser — count + unlock state (4.8)
router.get('/my/visitors/teaser', protect, authorize('provider'), async (req, res, next) => {
  try {
    if (!(await whoVisitedEnabled()))
      return fail(res, 'The "Who Visited" feature is currently disabled.', 403);

    const p = await Provider.findOne({ userId: req.user._id });
    if (!p) return fail(res, 'Provider profile not found.', 404);

    const { required, since, unlocked, adsWatched } = await visitorUnlockState(p._id);
    const count = await ProfileView.countDocuments({ providerId: p._id, createdAt: { $gte: since } });

    ok(res, { count, unlocked, adsWatched, adsRequired: required });
  } catch (e) { next(e); }
});

// POST /api/providers/my/ad-reward — record one verified rewarded-ad completion
// When the threshold is reached, flag the batch unlocked + notify the provider (4.9).
router.post('/my/ad-reward', protect, authorize('provider'), async (req, res, next) => {
  try {
    if (!(await whoVisitedEnabled()))
      return fail(res, 'The "Who Visited" feature is currently disabled.', 403);

    const p = await Provider.findOne({ userId: req.user._id });
    if (!p) return fail(res, 'Provider profile not found.', 404);

    await AdReward.create({ providerId: p._id });

    const before = await visitorUnlockState(p._id);
    let unlocked = before.unlocked;

    // Crossed the threshold on this watch → consume the pending batch + notify.
    if (!unlocked && before.pending >= before.required) {
      await AdReward.updateMany(
        { providerId: p._id, unlockedVisitorBatch: false, createdAt: { $gte: before.since } },
        { unlockedVisitorBatch: true }
      );
      unlocked = true;
      await pushNotify(req.app.locals.io, req.user._id, {
        type:  'visitors_unlocked',
        title: 'Visitor list unlocked!',
        body:  'You can now see who visited your profile this week.',
        link:  '/dashboard/provider',
      });
    }

    const adsWatched = unlocked ? before.required : before.pending;
    ok(res, { adsWatched, adsRequired: before.required, unlocked });
  } catch (e) { next(e); }
});

// PUT /api/providers/my/preferences — provider self-service toggles (lead alerts)
router.put('/my/preferences', protect, authorize('provider'), async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.leadNotifications === 'boolean') update.leadNotifications = req.body.leadNotifications;
    const p = await Provider.findOneAndUpdate({ userId: req.user._id }, update, { new: true });
    if (!p) return fail(res, 'Provider profile not found.', 404);
    ok(res, { leadNotifications: p.leadNotifications }, 'Preferences updated.');
  } catch (e) { next(e); }
});

// GET /api/providers/my/visitors — full visitor list (only when unlocked) (4.8)
router.get('/my/visitors', protect, authorize('provider'), async (req, res, next) => {
  try {
    if (!(await whoVisitedEnabled()))
      return fail(res, 'The "Who Visited" feature is currently disabled.', 403);

    const p = await Provider.findOne({ userId: req.user._id });
    if (!p) return fail(res, 'Provider profile not found.', 404);

    const { unlocked, since } = await visitorUnlockState(p._id);
    if (!unlocked)
      return fail(res, 'Watch the rewarded ads to unlock your visitor list.', 403);

    const views = await ProfileView.find({ providerId: p._id, createdAt: { $gte: since } })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);

    // Mask phone numbers; reveal name when available.
    const visitors = views.map(v => ({
      name:      v.customerId?.name ?? 'Guest visitor',
      phone:     v.customerId?.phone ? `+91 ••••• ${v.customerId.phone.slice(-4)}` : '—',
      visitedAt: v.createdAt,
    }));

    ok(res, visitors);
  } catch (e) { next(e); }
});

// GET /api/providers/saved — the logged-in customer's saved/bookmarked providers.
// Registered before GET /:id so "saved" isn't treated as a provider id.
router.get('/saved', protect, authorize('customer'), async (req, res, next) => {
  try {
    const rows = await SavedProvider.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'providerId',
        populate: { path: 'userId', select: 'name avatar location' },
      });
    // Drop entries whose provider was since deleted.
    const providers = rows.map(r => r.providerId).filter(Boolean);
    ok(res, providers);
  } catch (e) { next(e); }
});

// GET /api/providers/:id/save — is this provider saved by the current customer?
router.get('/:id/save', protect, authorize('customer'), async (req, res, next) => {
  try {
    const exists = await SavedProvider.exists({ customerId: req.user._id, providerId: req.params.id });
    ok(res, { saved: !!exists });
  } catch (e) { next(e); }
});

// POST /api/providers/:id/save — bookmark a provider (idempotent).
router.post('/:id/save', protect, authorize('customer'), async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return fail(res, 'Provider not found.', 404);
    await SavedProvider.updateOne(
      { customerId: req.user._id, providerId: provider._id },
      { $setOnInsert: { customerId: req.user._id, providerId: provider._id } },
      { upsert: true }
    );
    ok(res, { saved: true }, 'Provider saved.');
  } catch (e) { next(e); }
});

// DELETE /api/providers/:id/save — remove a bookmark.
router.delete('/:id/save', protect, authorize('customer'), async (req, res, next) => {
  try {
    await SavedProvider.deleteOne({ customerId: req.user._id, providerId: req.params.id });
    ok(res, { saved: false }, 'Removed from saved.');
  } catch (e) { next(e); }
});

// POST /api/providers/:id/view — log a profile view (public; optional auth)
router.post('/:id/view', async (req, res, next) => {
  try {
    // Skip view logging for demo (internal test) providers — don't pollute their stats.
    const providerForCheck = await Provider.findById(req.params.id).populate('userId', 'isDemo');
    if (!providerForCheck || providerForCheck.userId?.isDemo) return ok(res, null, 'View logged.');

    // Optional auth: attach customerId if a valid token was sent.
    let customerId = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        customerId = decoded.userId;
      } catch { /* ignore — treat as guest */ }
    }
    await ProfileView.create({
      providerId: req.params.id,
      customerId,
      guestId: customerId ? '' : (req.body.guestId || ''),
    });
    ok(res, null, 'View logged.');
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

// POST /api/providers/:id/contact — reveal contact + log the handoff
// Customer must be logged in (phone-verified). Records which channel was
// used and returns the provider's real phone for the call/WhatsApp action.
router.post('/:id/contact', protect, async (req, res, next) => {
  try {
    const { channel } = req.body;
    if (!['call', 'whatsapp'].includes(channel))
      return fail(res, "channel must be 'call' or 'whatsapp'.");

    const provider = await Provider.findById(req.params.id).populate('userId', 'phone isDemo');
    if (!provider) return fail(res, 'Provider not found.', 404);

    // Skip contact logging and notification for demo (internal test) providers.
    if (!provider.userId?.isDemo) {
      await ContactLog.create({
        customerId: req.user._id,
        providerId: provider._id,
        channel,
      });

      // 8.1 — notify the provider that a customer reached out.
      await pushNotify(req.app.locals.io, provider.userId?._id, {
        type:  'contact',
        title: channel === 'whatsapp' ? 'New WhatsApp enquiry' : 'New call enquiry',
        body:  `${req.user.name} requested your contact details.`,
        link:  '/dashboard/provider',
      });
    }

    ok(res, { phone: provider.userId?.phone ?? '' }, 'Contact revealed.');
  } catch (e) { next(e); }
});

// POST /api/providers — create profile
// Admin approval was removed, so new profiles go live immediately.
router.post('/', protect, authorize('provider'), async (req, res, next) => {
  try {
    const exists = await Provider.findOne({ userId: req.user._id });
    if (exists) return fail(res, 'Provider profile already exists.', 409);
    const badCat = await invalidCategory(req.body.category);
    if (badCat) return fail(res, badCat);
    const p = await Provider.create({
      ...req.body,
      userId:     req.user._id,
      status:     'active',
      isVerified: true,
    });
    res.status(201).json({ success: true, message: 'Profile created and published.', data: p });
  } catch (e) { next(e); }
});

// PUT /api/providers/:id — update own profile
router.put('/:id', protect, authorize('provider'), async (req, res, next) => {
  try {
    if (req.body.category !== undefined) {
      const badCat = await invalidCategory(req.body.category);
      if (badCat) return fail(res, badCat);
    }
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
