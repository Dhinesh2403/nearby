// src/routes/ads.js
// Ad-reward verification (7.13). The frontend calls this after a rewarded
// ad reports completion; the server is the source of truth for unlocking
// the visitor list, so a client cannot fake it.
const router = require('express').Router();
const { Provider, AdReward, AppSettings } = require('../models');
const { ok, fail, pushNotify } = require('../utils/helpers');
const { protect, authorize } = require('../middleware/auth');

// POST /api/ads/verify-reward — record one completed rewarded ad
router.post('/verify-reward', protect, authorize('provider'), async (req, res, next) => {
  try {
    const settings = await AppSettings.getSingleton();
    if (!settings.adsEnabled || !settings.rewardedAdsEnabled)
      return fail(res, 'Rewarded ads are currently disabled.', 403);

    const p = await Provider.findOne({ userId: req.user._id });
    if (!p) return fail(res, 'Provider profile not found.', 404);

    const required = settings.adsRequiredCount ?? 2;
    await AdReward.create({ providerId: p._id, adType: 'rewarded' });

    const adsWatched = await AdReward.countDocuments({ providerId: p._id, unlockedVisitorBatch: false });
    const unlocked   = adsWatched >= required;

    if (unlocked) {
      await AdReward.updateMany(
        { providerId: p._id, unlockedVisitorBatch: false },
        { unlockedVisitorBatch: true }
      );
      await pushNotify(req.app.locals.io, req.user._id, {
        type:  'visitors_unlocked',
        title: 'Visitor list unlocked!',
        body:  'You can now see who visited your profile this week.',
        link:  '/dashboard/provider',
      });
    }

    ok(res, { adsWatched, adsRequired: required, unlocked }, 'Reward verified.');
  } catch (e) { next(e); }
});

module.exports = router;
