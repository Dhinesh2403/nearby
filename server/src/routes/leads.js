// src/routes/leads.js
// Quick enquiry lead capture from the results-page sidebar form (11.17).
// Public — a guest can submit name + mobile + what they're looking for.
const router = require('express').Router();
const { Lead } = require('../models');
const { ok, fail } = require('../utils/helpers');

// POST /api/leads
router.post('/', async (req, res, next) => {
  try {
    const { name, mobile, service, location } = req.body;
    if (!name || !mobile) return fail(res, 'Name and mobile are required.');
    if (!/^\d{10}$/.test(String(mobile).replace(/\D/g, '').slice(-10)))
      return fail(res, 'Enter a valid 10-digit mobile number.');

    const lead = await Lead.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      service: service || '',
      location: location || '',
    });
    res.status(201).json({ success: true, message: 'Enquiry received.', data: { _id: lead._id } });
  } catch (e) { next(e); }
});

module.exports = router;
