// src/routes/reviews.js
const router = require('express').Router();
const {
  Review, Provider, User, Complaint, Conversation,
  ContactLog, ProfileView, AdReward, AppSettings, AdminLog,
} = require('../models');
const { ok, fail, pushNotify } = require('../utils/helpers');
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

// POST /api/reviews/direct — "Click to Rate" — one review per customer per provider
// One direct review per customer per provider; re-rating updates it.
router.post('/direct', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { providerId, rating, review } = req.body;
    if (!providerId || !rating) return fail(res, 'providerId and rating are required.');
    if (rating < 1 || rating > 5) return fail(res, 'Rating must be 1–5.');

    const provider = await Provider.findById(providerId);
    if (!provider) return fail(res, 'Provider not found.', 404);

    // Upsert the customer's review for this provider (one per customer per provider).
    const r = await Review.findOneAndUpdate(
      { providerId, customerId: req.user._id },
      { rating, review: review || '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Recalculate the provider's rating average across all visible reviews.
    const stats = await Review.aggregate([
      { $match: { providerId: provider._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length) {
      await Provider.findByIdAndUpdate(provider._id, {
        ratingAvg:   parseFloat(stats[0].avg.toFixed(1)),
        ratingCount: stats[0].count,
      });
    }

    await pushNotify(req.app.locals.io, provider.userId, {
      type:  'review',
      title: `New ${rating}★ rating`,
      body:  (review && review.trim()) ? `"${review.trim().slice(0, 80)}"` : 'A customer rated your service.',
      link:  '/dashboard/provider',
    });

    res.status(201).json({ success: true, message: 'Thanks for rating!', data: r });
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
    const settings = await AppSettings.getSingleton();
    if (!settings.complaintsEnabled)
      return fail(res, 'Complaint submissions are currently disabled.', 403);

    const { against, type, description, evidence } = req.body;
    if (!against || !type || !description)
      return fail(res, 'against, type and description are required.');
    const c = await Complaint.create({
      raisedBy: req.user._id,
      against, type, description,
      evidence: Array.isArray(evidence) ? evidence : [],
    });

    // 8.3 — notify every admin that a complaint was filed.
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map(a => pushNotify(req.app.locals.io, a._id, {
      type:  'complaint',
      title: 'New complaint filed',
      body:  `${req.user.name} reported a ${type} issue.`,
      link:  '/admin?tab=complaints',
    })));

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

// POST /api/complaints/:id/chat — admin opens (find-or-create) a support
// conversation with the user who raised the complaint, to discuss it.
complaintRouter.post('/:id/chat', protect, authorize('admin'), async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('raisedBy', 'name');
    if (!complaint) return fail(res, 'Complaint not found.', 404);
    const target = complaint.raisedBy;
    if (!target) return fail(res, 'The user who raised this complaint no longer exists.', 404);

    const filter = { customerId: target._id, providerUserId: req.user._id, kind: 'support' };
    let conv = await Conversation.findOne(filter);
    if (!conv) conv = await Conversation.create(filter);
    ok(res, { _id: conv._id, otherName: target.name || 'User' });
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

// Helper — append an audit-log entry (5.14). Non-fatal on failure.
const logAdmin = async (req, action, detail = '') => {
  try {
    await AdminLog.create({ adminId: req.user._id, adminName: req.user.name, action, detail });
  } catch (_) { /* ignore */ }
};

// GET /api/admin/dashboard — overview counts (5.3)
adminRouter.get('/dashboard', async (req, res, next) => {
  try {
    const [customers, providers, contacts, complaints, suspended] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Provider.countDocuments({ status: 'active' }),
      ContactLog.countDocuments(),
      Complaint.countDocuments({ status: 'open' }),
      Provider.countDocuments({ status: 'suspended' }),
    ]);
    const settings  = await AppSettings.getSingleton();
    const activeAds = settings.adsEnabled;
    ok(res, {
      customers, activeProviders: providers, contacts,
      openComplaints: complaints, suspendedProviders: suspended,
      activeAds,
      // legacy alias still consumed by older UI
      users: customers + providers,
    });
  } catch (e) { next(e); }
});

// GET /api/admin/providers — all providers w/ per-provider stats (5.4, 5.6)
adminRouter.get('/providers', async (req, res, next) => {
  try {
    const providers = await Provider.find().populate('userId', 'name email phone isActive').sort({ createdAt: -1 });
    const withStats = await Promise.all(providers.map(async (p) => {
      const [views, contacts, adWatches] = await Promise.all([
        ProfileView.countDocuments({ providerId: p._id }),
        ContactLog.countDocuments({ providerId: p._id }),
        AdReward.countDocuments({ providerId: p._id }),
      ]);
      return {
        _id: p._id, businessName: p.businessName, category: p.category,
        subCategory: p.subCategory, status: p.status, isVerified: p.isVerified,
        user: p.userId,
        stats: { views, contacts, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, adWatches },
      };
    }));
    ok(res, withStats);
  } catch (e) { next(e); }
});

// GET /api/admin/customers — all customers w/ activity (5.5)
adminRouter.get('/customers', async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
    const withActivity = await Promise.all(customers.map(async (c) => {
      const [contacts, views] = await Promise.all([
        ContactLog.countDocuments({ customerId: c._id }),
        ProfileView.countDocuments({ customerId: c._id }),
      ]);
      return {
        _id: c._id, name: c.name, email: c.email, phone: c.phone,
        isActive: c.isActive, createdAt: c.createdAt,
        activity: { contacts, profileViews: views },
      };
    }));
    ok(res, withActivity);
  } catch (e) { next(e); }
});

// PUT /api/admin/providers/:id/ban — suspend a provider (5.8)
adminRouter.put('/providers/:id/ban', async (req, res, next) => {
  try {
    const p = await Provider.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', isVerified: false, banReason: req.body.reason || '' },
      { new: true }
    ).populate('userId', 'name');
    if (!p) return fail(res, 'Provider not found.', 404);

    // Deactivate the account too: no listing AND the provider can no longer log in.
    if (p.userId?._id) await User.findByIdAndUpdate(p.userId._id, { isActive: false });

    await logAdmin(req, 'ban_provider', `${p.businessName} (${req.body.reason || 'no reason'})`);
    await pushNotify(req.app.locals.io, p.userId?._id, {
      type:  'account',
      title: 'Account deactivated',
      body:  'Your listing was suspended and your account deactivated by the admin.' + (req.body.reason ? ` Reason: ${req.body.reason}` : ''),
      link:  '/dashboard/provider',
    });
    ok(res, p, 'Provider deactivated.');
  } catch (e) { next(e); }
});

// PUT /api/admin/providers/:id/unban — reinstate a provider (5.11)
adminRouter.put('/providers/:id/unban', async (req, res, next) => {
  try {
    const p = await Provider.findByIdAndUpdate(
      req.params.id,
      { status: 'active', isVerified: true, banReason: '' },
      { new: true }
    ).populate('userId', 'name');
    if (!p) return fail(res, 'Provider not found.', 404);

    // Re-enable login alongside reinstating the listing.
    if (p.userId?._id) await User.findByIdAndUpdate(p.userId._id, { isActive: true });

    await logAdmin(req, 'unban_provider', p.businessName);
    await pushNotify(req.app.locals.io, p.userId?._id, {
      type:  'account',
      title: 'Account reactivated',
      body:  'Good news — your account is active and your listing is live again.',
      link:  '/dashboard/provider',
    });
    ok(res, p, 'Provider reactivated.');
  } catch (e) { next(e); }
});

// ── Users (kept for backward compatibility) ────────────────────
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
    await logAdmin(req, 'ban_user', u.name);
    await pushNotify(req.app.locals.io, u._id, {
      type:  'account',
      title: 'Account deactivated',
      body:  'Your account has been deactivated by the admin. You can no longer sign in.',
      link:  '/',
    });
    ok(res, u, 'User deactivated.');
  } catch (e) { next(e); }
});

adminRouter.put('/users/:id/unban', async (req, res, next) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!u) return fail(res, 'User not found.', 404);
    await logAdmin(req, 'unban_user', u.name);
    await pushNotify(req.app.locals.io, u._id, {
      type:  'account',
      title: 'Account reactivated',
      body:  'Good news — your account is active again. You can sign in.',
      link:  '/',
    });
    ok(res, u, 'User reactivated.');
  } catch (e) { next(e); }
});

// ── App Settings (5.12) ────────────────────────────────────────
adminRouter.get('/settings', async (req, res, next) => {
  try { ok(res, await AppSettings.getSingleton()); } catch (e) { next(e); }
});

adminRouter.put('/settings', async (req, res, next) => {
  try {
    const allowed = [
      'otpEnabled','adsEnabled',
      'rewardedAdsEnabled','whoVisitedEnabled','adsRequiredCount',
      'registrationsEnabled','complaintsEnabled','featuredCategories',
      'bannerAdUnitId','rewardedAdUnitId',
    ];
    const s = await AppSettings.getSingleton();
    const changed = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined && JSON.stringify(s[key]) !== JSON.stringify(req.body[key])) {
        changed.push(key);
        s[key] = req.body[key];
      }
    }
    await s.save();
    if (changed.length) await logAdmin(req, 'update_settings', changed.join(', '));
    ok(res, s, 'Settings updated.');
  } catch (e) { next(e); }
});

// PUT /api/admin/announcement — homepage global banner (5.13)
adminRouter.put('/announcement', async (req, res, next) => {
  try {
    const s = await AppSettings.getSingleton();
    s.announcement = { active: !!req.body.active, text: req.body.text || '' };
    await s.save();
    await logAdmin(req, 'update_announcement', s.announcement.active ? s.announcement.text : 'disabled');
    ok(res, s.announcement, 'Announcement updated.');
  } catch (e) { next(e); }
});

// GET /api/admin/logs — admin activity log (5.14)
adminRouter.get('/logs', async (req, res, next) => {
  try {
    const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(100);
    ok(res, logs);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────
// PUBLIC settings router — homepage banner, banned-scam alert,
// and feature flags the frontend needs without admin auth.
// ─────────────────────────────────────────────────────────────
const settingsRouter = require('express').Router();

settingsRouter.get('/public', async (req, res, next) => {
  try {
    const s = await AppSettings.getSingleton();
    // Providers suspended in the last 14 days → scam alert banner (5.10)
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const banned = await Provider.find({ status: 'suspended', updatedAt: { $gte: since } })
      .select('businessName').limit(10);
    ok(res, {
      announcement:         s.announcement,
      otpEnabled:           s.otpEnabled,
      adsEnabled:           s.adsEnabled,
      rewardedAdsEnabled:   s.rewardedAdsEnabled,
      whoVisitedEnabled:    s.whoVisitedEnabled,
      registrationsEnabled: s.registrationsEnabled,
      complaintsEnabled:    s.complaintsEnabled,
      featuredCategories:   s.featuredCategories,
      bannerAdUnitId:       s.bannerAdUnitId,
      rewardedAdUnitId:     s.rewardedAdUnitId,
      recentlyBanned:       banned.map(b => b.businessName),
    });
  } catch (e) { next(e); }
});

module.exports = { reviewRouter: router, complaintRouter, notifRouter, adminRouter, settingsRouter };
