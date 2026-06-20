// src/routes/leads.js
// Quick enquiry lead capture from the results-page sidebar form (11.17).
// Public POST — a guest can submit name + mobile + what they're looking for.
// On submit we fan the lead out to matching providers (same category + district)
// as a live notification, and expose a protected list so providers can review
// the leads that match them from their dashboard.
const router = require('express').Router();
const { Lead, Provider } = require('../models');
const { ok, fail, pushNotify } = require('../utils/helpers');
const { protect, authorize } = require('../middleware/auth');

// Find providers a lead should reach: active + verified, matching the lead's
// category (when one was chosen) and serving the lead's district — online
// providers serve any district. Mirrors the browse matching in providers.js.
const matchProviders = async ({ category, location }) => {
  const filter = { status: 'active', isVerified: true };
  if (category && category !== 'all') filter.category = category;

  const providers = await Provider.find(filter)
    .populate('userId', 'location isDemo')
    .select('userId isOnline leadNotifications');

  const d = String(location || '').toLowerCase();
  return providers.filter(p => {
    if (p.userId?.isDemo) return false;                 // never ping internal test accounts
    if (p.leadNotifications === false) return false;    // provider opted out of lead alerts
    if (!d) return true;                                // no district given → anyone in category
    return p.isOnline || (p.userId?.location?.district || '').toLowerCase() === d;
  });
};

// POST /api/leads — public lead capture + fan-out to matching providers
router.post('/', async (req, res, next) => {
  try {
    const { name, mobile, service, category, location } = req.body;
    if (!name || !mobile) return fail(res, 'Name and mobile are required.');
    if (!/^\d{10}$/.test(String(mobile).replace(/\D/g, '').slice(-10)))
      return fail(res, 'Enter a valid 10-digit mobile number.');

    const lead = await Lead.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      service: service || '',
      category: category && category !== 'all' ? category : '',
      location: location || '',
    });

    // Notify every matching provider's bell (non-fatal — never block the reply).
    try {
      const providers = await matchProviders(lead);
      const where = lead.location ? ` in ${lead.location}` : '';
      await Promise.all(providers.map(p => pushNotify(req.app.locals.io, p.userId?._id, {
        type:  'lead',
        title: 'New customer enquiry',
        body:  `${lead.name} is looking for ${lead.service || 'a service'}${where}.`,
        link:  '/dashboard/provider',
      })));
    } catch (_) { /* notification failures must not fail the enquiry */ }

    res.status(201).json({ success: true, message: 'Enquiry received.', data: { _id: lead._id } });
  } catch (e) { next(e); }
});

// GET /api/leads — leads matching the logged-in provider (category + district)
router.get('/', protect, authorize('provider'), async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id }).select('category isOnline');
    if (!provider) return fail(res, 'Provider profile not found.', 404);

    const district = (req.user.location?.district || '').toLowerCase();

    // Category: the provider's own category, plus uncategorised broadcast leads.
    const filter = { category: { $in: [provider.category, ''] } };

    // District: this provider's district (case-insensitive) or unspecified.
    // Online providers serve any district, so they skip the district narrowing.
    if (district && !provider.isOnline) {
      filter.$or = [
        { location: new RegExp(`^${district}$`, 'i') },
        { location: '' },
      ];
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(30);
    ok(res, leads);
  } catch (e) { next(e); }
});

module.exports = router;
