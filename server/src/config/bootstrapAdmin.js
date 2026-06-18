// src/config/bootstrapAdmin.js
// Ensures an admin account exists, created from env vars (never via the
// public register route, which only allows customer/provider). Run once
// on server start. Safe to re-run — it won't duplicate or overwrite.
//
// Set in .env:
//   ADMIN_EMAIL=admin@nearby.app
//   ADMIN_PASSWORD=change-me-strong
//   ADMIN_PHONE=9000000099   (optional)
const crypto = require('crypto');
const { User } = require('../models');

module.exports = async function bootstrapAdmin() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;   // not configured — skip silently

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Make sure the configured account always has admin rights.
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`🔑  Promoted ${email} to admin.`);
      }
      return;
    }

    await User.create({
      name:  'Administrator',
      email: email.toLowerCase(),
      phone: process.env.ADMIN_PHONE || `9${crypto.randomInt(100000000, 999999999)}`,
      passwordHash: password,        // pre-save hook hashes this
      role:  'admin',
    });
    console.log(`🔑  Admin account created: ${email}`);
  } catch (err) {
    console.error('⚠️   Admin bootstrap failed:', err.message);
  }
};
