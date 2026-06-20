// src/seeds/seed.prod.js
// Production seed — nearby_prod
//
// Creates exactly 3 internal demo accounts (isDemo: true) for developer
// testing on the live database. These accounts are:
//   • Invisible to real users (filtered out of all browse / search results)
//   • Profile views and contact logs are NOT recorded for them
//   • Their actions do not trigger any notifications to other real users
//
// Run ONCE after the production DB is provisioned:
//   MONGO_URI=<prod-atlas-uri> npm run seed:prod
//
// WARNING: This script will DELETE and re-create the 3 demo accounts.
//          It will NOT touch any real user data.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.production') });

const mongoose = require('mongoose');
const { User, Provider } = require('../models');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set. Set it via .env.production or the environment.');
  process.exit(1);
}

// Credentials for the 3 internal demo accounts.
// Change these before running — do NOT commit real secrets.
const DEMO_CUSTOMER_EMAIL    = process.env.DEMO_CUSTOMER_EMAIL    || 'demo.customer@nearby.internal';
const DEMO_CUSTOMER_PHONE    = process.env.DEMO_CUSTOMER_PHONE    || '9800000001';
const DEMO_CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || 'DemoCustomer@99';

const DEMO_PROVIDER_EMAIL    = process.env.DEMO_PROVIDER_EMAIL    || 'demo.provider@nearby.internal';
const DEMO_PROVIDER_PHONE    = process.env.DEMO_PROVIDER_PHONE    || '9800000002';
const DEMO_PROVIDER_PASSWORD = process.env.DEMO_PROVIDER_PASSWORD || 'DemoProvider@99';

const DEMO_ADMIN_EMAIL       = process.env.DEMO_ADMIN_EMAIL       || 'demo.admin@nearby.internal';
const DEMO_ADMIN_PHONE       = process.env.DEMO_ADMIN_PHONE       || '9800000099';
const DEMO_ADMIN_PASSWORD    = process.env.DEMO_ADMIN_PASSWORD    || 'DemoAdmin@99';

const DEMO_EMAILS = [DEMO_CUSTOMER_EMAIL, DEMO_PROVIDER_EMAIL, DEMO_ADMIN_EMAIL];

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`✅  Connected → ${MONGO_URI}`);

  // ── Remove old demo accounts only ─────────────────────────────
  const existing    = await User.find({ email: { $in: DEMO_EMAILS } });
  const existingIds = existing.map(u => u._id);

  await User.deleteMany({ email: { $in: DEMO_EMAILS } });
  await Provider.deleteMany({ userId: { $in: existingIds } });
  console.log('🗑️   Cleared old demo accounts');

  // ── Demo Customer ──────────────────────────────────────────────
  const demoCustomer = await User.create({
    name: 'Demo Customer',
    email: DEMO_CUSTOMER_EMAIL,
    phone: DEMO_CUSTOMER_PHONE,
    passwordHash: DEMO_CUSTOMER_PASSWORD,
    hasPassword: true,
    role: 'customer',
    isDemo: true,
    location: {
      type: 'Point',
      coordinates: [80.2707, 13.0827],
      address: 'Anna Nagar', district: 'Chennai', area: 'Anna Nagar',
      city: 'Chennai', pincode: '600040',
    },
  });
  console.log(`✅  Demo customer: ${DEMO_CUSTOMER_EMAIL}`);

  // ── Demo Provider ──────────────────────────────────────────────
  const demoProviderUser = await User.create({
    name: 'Demo Provider',
    email: DEMO_PROVIDER_EMAIL,
    phone: DEMO_PROVIDER_PHONE,
    passwordHash: DEMO_PROVIDER_PASSWORD,
    hasPassword: true,
    role: 'provider',
    isDemo: true,
    location: {
      type: 'Point',
      coordinates: [80.2500, 13.0600],
      address: 'T. Nagar', district: 'Chennai', area: 'T. Nagar',
      city: 'Chennai', pincode: '600017',
    },
  });

  await Provider.create({
    userId:       demoProviderUser._id,
    businessName: 'Demo Service Provider',
    tagline:      'Internal demo account — not a real business',
    category:     'home_services',
    subCategory:  'Demo',
    skills:       ['Testing', 'QA'],
    experience:   1,
    price:        100,
    isVerified:   true,
    isOnline:     true,
    status:       'active',
    bio:          'This is an internal demo provider account used for testing. Not visible to real users.',
    ratingAvg:    5.0,
    ratingCount:  1,
  });
  console.log(`✅  Demo provider: ${DEMO_PROVIDER_EMAIL}`);

  // ── Demo Admin ─────────────────────────────────────────────────
  await User.create({
    name: 'Demo Admin',
    email: DEMO_ADMIN_EMAIL,
    phone: DEMO_ADMIN_PHONE,
    passwordHash: DEMO_ADMIN_PASSWORD,
    hasPassword: true,
    role: 'admin',
    isDemo: true,
    location: {
      type: 'Point',
      coordinates: [80.2785, 13.0878],
      address: 'Egmore', district: 'Chennai', area: 'Egmore',
      city: 'Chennai', pincode: '600008',
    },
  });
  console.log(`✅  Demo admin: ${DEMO_ADMIN_EMAIL}`);

  console.log('\n─────────────────────────────────────────────────');
  console.log('🔒  PRODUCTION demo accounts seeded (nearby_prod)');
  console.log('');
  console.log('  All accounts have isDemo: true');
  console.log('  They are INVISIBLE to real users in browse/search');
  console.log('  Views and contact logs are NOT recorded for them');
  console.log('');
  console.log(`  ${DEMO_CUSTOMER_EMAIL} / ${DEMO_CUSTOMER_PASSWORD} (customer)`);
  console.log(`  ${DEMO_PROVIDER_EMAIL} / ${DEMO_PROVIDER_PASSWORD} (provider)`);
  console.log(`  ${DEMO_ADMIN_EMAIL}    / ${DEMO_ADMIN_PASSWORD}    (admin)`);
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌  Production seed failed:', err.message);
  process.exit(1);
});
