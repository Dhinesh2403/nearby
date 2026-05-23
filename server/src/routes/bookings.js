// src/routes/bookings.js
const router   = require('express').Router();
const { Booking, Provider, Notification } = require('../models');
const { ok, fail }            = require('../utils/helpers');
const { protect, authorize }  = require('../middleware/auth');

// Helper — create notification record
const notify = async (userId, type, title, body, link = '') => {
  try {
    await Notification.create({ userId, type, title, body, link });
  } catch (_) { /* non-fatal */ }
};

// GET /api/bookings — list (scoped by role)
router.get('/', protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'provider') {
      const prov = await Provider.findOne({ userId: req.user._id });
      if (!prov) return ok(res, []);
      filter.providerId = prov._id;
    }
    // admin sees all

    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('customerId', 'name phone avatar')
      .populate('providerId', 'businessName ratingAvg')
      .populate('serviceId',  'title price')
      .sort({ createdAt: -1 });

    ok(res, bookings);
  } catch (e) { next(e); }
});

// GET /api/bookings/:id — single booking
router.get('/:id', protect, async (req, res, next) => {
  try {
    const b = await Booking.findById(req.params.id)
      .populate('customerId', 'name phone avatar location')
      .populate('providerId', 'businessName ratingAvg userId')
      .populate('serviceId',  'title description price');
    if (!b) return fail(res, 'Booking not found.', 404);
    ok(res, b);
  } catch (e) { next(e); }
});

// POST /api/bookings — create (customer only)
router.post('/', protect, authorize('customer'), async (req, res, next) => {
  try {
    const { providerId, serviceId, bookingType, scheduledDate, scheduledTime, address, notes } = req.body;
    if (!providerId || !scheduledDate || !scheduledTime)
      return fail(res, 'providerId, scheduledDate and scheduledTime are required.');

    const meetingLink = bookingType === 'remote'
      ? `https://meet.jit.si/nearby-${Date.now()}`
      : '';

    const booking = await Booking.create({
      customerId: req.user._id,
      providerId, serviceId,
      bookingType:   bookingType   || 'in_person',
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      address:     address  || '',
      meetingLink,
      notes:       notes    || '',
    });

    // Notify provider
    const prov = await Provider.findById(providerId);
    if (prov) await notify(prov.userId, 'booking_new', 'New booking request',
      `You have a new booking on ${scheduledDate} at ${scheduledTime}.`,
      `/dashboard/provider`);

    res.status(201).json({ success: true, message: 'Booking request sent.', data: booking });
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/accept
router.put('/:id/accept', protect, authorize('provider'), async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    if (!b) return fail(res, 'Booking not found.', 404);
    await notify(b.customerId, 'booking_accepted', 'Booking accepted!',
      'Your booking has been accepted by the provider.', `/booking/${b._id}`);
    ok(res, b, 'Booking accepted.');
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/reject
router.put('/:id/reject', protect, authorize('provider'), async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'rejected', rejectReason: req.body.reason || '' },
      { new: true }
    );
    if (!b) return fail(res, 'Booking not found.', 404);
    await notify(b.customerId, 'booking_rejected', 'Booking rejected',
      req.body.reason || 'The provider could not accept your booking.', `/dashboard/customer`);
    ok(res, b, 'Booking rejected.');
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/complete
router.put('/:id/complete', protect, authorize('provider'), async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!b) return fail(res, 'Booking not found.', 404);
    // Increment provider's total bookings
    await Provider.findByIdAndUpdate(b.providerId, { $inc: { totalBookings: 1 } });
    await notify(b.customerId, 'booking_completed', 'Service completed!',
      'How was it? Leave a review for your provider.', `/booking/${b._id}`);
    ok(res, b, 'Booking completed.');
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'cancelled', cancelReason: req.body.reason || '' },
      { new: true }
    );
    if (!b) return fail(res, 'Booking not found.', 404);
    ok(res, b, 'Booking cancelled.');
  } catch (e) { next(e); }
});

module.exports = router;
