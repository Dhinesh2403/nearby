// src/routes/bookings.js
const router   = require('express').Router();
const { Booking, Provider, Notification } = require('../models');
const { ok, fail }            = require('../utils/helpers');
const { protect, authorize }  = require('../middleware/auth');

// Helper — create notification record + push it live (toast + badge).
// `io` comes from req.app.locals.io at each call site.
const notify = async (io, userId, type, title, body, link = '') => {
  if (!userId) return;
  try {
    await Notification.create({ userId, type, title, body, link });
    if (io) io.notifyUser(userId.toString(), 'notify:new', { type, title, body, link });
  } catch (_) { /* non-fatal */ }
};

// n8n "Booking → WhatsApp" workflow webhook.
// Override with N8N_BOOKING_WEBHOOK_URL in .env; falls back to the cloud workflow.
const N8N_BOOKING_WEBHOOK_URL =
  process.env.N8N_BOOKING_WEBHOOK_URL ||
  'https://dhinesh2403.app.n8n.cloud/webhook/booking-notification';

// Helper — normalise an Indian phone number to E.164 with a +91 prefix.
// Accepts "9876543210", "09876543210", "+919876543210", "91 98765 43210", etc.
const toE164India = (raw = '') => {
  let digits = String(raw).replace(/\D/g, '');   // keep digits only
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : '';
};

// Helper — push a "new booking" event to the n8n webhook, which sends the
// WhatsApp message. Non-blocking and non-fatal: a webhook failure never breaks
// the booking. The payload shape matches what the n8n workflow expects:
//   { phone, message }
const sendWhatsAppBooking = async (payload) => {
  if (!N8N_BOOKING_WEBHOOK_URL) {
    console.log('\n📲  [DEV WHATSAPP — n8n webhook not configured] would have sent:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  try {
    const res = await fetch(N8N_BOOKING_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) console.error(`WhatsApp webhook responded ${res.status}`);
  } catch (e) {
    console.error('WhatsApp webhook failed:', e.message);
  }
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
      .populate('providerId', 'businessName ratingAvg userId')
      .populate('serviceId',  'title price')
      .sort({ createdAt: -1 });

    ok(res, bookings);
  } catch (e) { next(e); }
});

// Re-fetch a booking with the standard populated fields the UI expects
const findBookingPopulated = (id) =>
  Booking.findById(id)
    .populate('customerId', 'name phone avatar location')
    .populate('providerId', 'businessName ratingAvg userId')
    .populate('serviceId',  'title description price');

// GET /api/bookings/:id — single booking
router.get('/:id', protect, async (req, res, next) => {
  try {
    const b = await findBookingPopulated(req.params.id);
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

    // Prevent double-booking: the same provider can't hold two live bookings
    // at the same date + time.
    const slotTaken = await Booking.findOne({
      providerId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: ['pending', 'accepted', 'in_progress'] },
    });
    if (slotTaken)
      return fail(res, 'That time slot is already booked. Please choose another time.', 409);

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

    // Notify provider (in-app) + WhatsApp via n8n
    const prov = await Provider.findById(providerId).populate('userId', 'name phone');
    if (prov) {
      await notify(req.app.locals.io, prov.userId._id, 'booking_new', 'New booking request',
        `You have a new booking on ${scheduledDate} at ${scheduledTime}.`,
        `/dashboard/provider`);

      // Fire-and-forget WhatsApp to the PROVIDER through n8n.
      // We build the complete message here and send just the number + message;
      // in n8n, map the WhatsApp text to {{ $json.body.message }} and the
      // recipient to {{ $json.body.customerPhone }}.
      const providerPhone = toE164India(prov.userId?.phone);
      if (providerPhone) {
        const providerName = prov.userId?.name || prov.businessName;
        const serviceLabel = prov.subCategory || prov.businessName || 'your service';
        const place = booking.bookingType === 'remote'
          ? (booking.meetingLink ? `Online — ${booking.meetingLink}` : 'Online session')
          : (booking.address || 'Address not provided');

        const message =
          `Hi ${providerName}, you have a new booking on NearBy! 🎉\n\n` +
          `👤 Customer: ${req.user.name} (${toE164India(req.user.phone)})\n` +
          `🛠️ Service: ${serviceLabel}\n` +
          `📅 Date: ${scheduledDate}\n` +
          `⏰ Time: ${scheduledTime}\n` +
          `📍 Place: ${place}\n` +
          (booking.notes ? `📝 Notes: ${booking.notes}\n` : '') +
          `\nPlease provide a valuable service to them. — NearBy`;

        sendWhatsAppBooking({
          phone:   providerPhone,   // recipient number (the provider)
          message,                  // full message text — contains all details
        });
      } else {
        console.warn('⚠️  Provider has no phone number — WhatsApp not sent for booking', booking._id.toString());
      }
    }

    res.status(201).json({ success: true, message: 'Booking request sent.', data: booking });
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/accept
router.put('/:id/accept', protect, authorize('provider'), async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    if (!b) return fail(res, 'Booking not found.', 404);
    await notify(req.app.locals.io, b.customerId, 'booking_accepted', 'Booking accepted!',
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
    await notify(req.app.locals.io, b.customerId, 'booking_rejected', 'Booking rejected',
      req.body.reason || 'The provider could not accept your booking.', `/dashboard/customer`);
    ok(res, b, 'Booking rejected.');
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/complete — provider or the booking's customer
router.put('/:id/complete', protect, authorize('provider', 'customer'), async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!b) return fail(res, 'Booking not found.', 404);
    // Increment provider's total bookings
    await Provider.findByIdAndUpdate(b.providerId, { $inc: { totalBookings: 1 } });
    await notify(req.app.locals.io, b.customerId, 'booking_completed', 'Service completed!',
      'How was it? Leave a review for your provider.', `/booking/${b._id}`);

    const populated = await findBookingPopulated(b._id);
    ok(res, populated, 'Booking completed.');
  } catch (e) { next(e); }
});

// PUT /api/bookings/:id/cancel — customer (or provider) cancels
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'cancelled', cancelReason: req.body.reason || '' },
      { new: true }
    ).populate('customerId', 'name');
    if (!b) return fail(res, 'Booking not found.', 404);

    // Notify the provider (in-app + WhatsApp via n8n)
    const prov = await Provider.findById(b.providerId).populate('userId', 'name phone');
    if (prov?.userId) {
      const when = new Date(b.scheduledDate).toISOString().split('T')[0];
      await notify(req.app.locals.io, prov.userId._id, 'booking_cancelled', 'Booking cancelled',
        `A booking on ${when} at ${b.scheduledTime} was cancelled.`, '/dashboard/provider');

      const providerPhone = toE164India(prov.userId.phone);
      if (providerPhone) {
        const customerName = b.customerId?.name || 'A customer';
        const place = b.bookingType === 'remote' ? 'Online session' : (b.address || 'N/A');
        const message =
          `Hi ${prov.userId.name || prov.businessName}, a NearBy booking has been CANCELLED. ❌\n\n` +
          `👤 Customer: ${customerName}\n` +
          `📅 Date: ${when}\n` +
          `⏰ Time: ${b.scheduledTime}\n` +
          `📍 Place: ${place}\n` +
          (b.cancelReason ? `📝 Reason: ${b.cancelReason}\n` : '') +
          `\n— NearBy`;
        sendWhatsAppBooking({ phone: providerPhone, message });
      }
    }

    const populated = await findBookingPopulated(b._id);
    ok(res, populated, 'Booking cancelled.');
  } catch (e) { next(e); }
});

module.exports = router;
