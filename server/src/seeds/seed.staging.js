// src/seeds/seed.staging.js
// Staging seed — nearby_staging
// Mirrors realistic production shape with a small but complete dataset.
// Run: npm run seed:staging
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.staging') });

const mongoose = require('mongoose');
const { User, Provider, Review } = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nearby_staging';

const users = [
  { name: 'Test Customer',  email: 'customer@staging.test',  phone: '9100000001', password: 'Staging@1234', role: 'customer', district: 'Chennai',     area: 'Anna Nagar' },
  { name: 'Test Provider',  email: 'provider@staging.test',  phone: '9100000002', password: 'Staging@1234', role: 'provider', district: 'Chennai',     area: 'T. Nagar'   },
  { name: 'Food Provider',  email: 'food@staging.test',      phone: '9100000003', password: 'Staging@1234', role: 'provider', district: 'Chennai',     area: 'Adyar'      },
  { name: 'Staging Admin',  email: 'admin@staging.test',     phone: '9100000099', password: 'Admin@1234',   role: 'admin',    district: 'Chennai',     area: 'Egmore'     },
];

const providerProfiles = [
  {
    email: 'provider@staging.test',
    businessName: 'Staging Plumber Pro', tagline: 'Quality plumbing for staging',
    category: 'home_services', subCategory: 'Plumber',
    skills: ['Pipe Fitting', 'Drain Cleaning', 'Tap Installation'],
    experience: 5, price: 350, priceMax: 1200, isVerified: true, isOnline: true, status: 'active',
    bio: 'Professional plumbing service for staging environment testing.',
    ratingAvg: 4.5, ratingCount: 32,
  },
  {
    email: 'food@staging.test',
    businessName: 'Staging Tiffin Co.', tagline: 'Fresh meals for staging tests',
    category: 'food', subCategory: 'Tiffin Service',
    skills: ['South Indian', 'Veg Meals', 'Monthly Plans'],
    experience: 3, price: 100, priceMax: 400, isVerified: true, isOnline: false, status: 'active',
    bio: 'Home-cooked meals for staging environment testing.',
    ratingAvg: 4.3, ratingCount: 18,
  },
];

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`✅  Connected → ${MONGO_URI}`);

  const emails = users.map(u => u.email);
  const existingUsers = await User.find({ email: { $in: emails } });
  const existingIds   = existingUsers.map(u => u._id);

  await User.deleteMany({ email: { $in: emails } });
  await Provider.deleteMany({ userId: { $in: existingIds } });
  await Review.deleteMany({});
  console.log('🗑️   Cleared old staging seed data');

  const created = {};
  for (const u of users) {
    const doc = await User.create({
      name: u.name, email: u.email, phone: u.phone,
      passwordHash: u.password,
      hasPassword: true,
      role: u.role,
      location: {
        type: 'Point',
        coordinates: [80.2707 + (Math.random() - 0.5) * 0.05, 13.0827 + (Math.random() - 0.5) * 0.05],
        address: u.area || '', district: u.district || 'Chennai', area: u.area || '',
        city: 'Chennai', pincode: '600001',
      },
    });
    created[u.email] = doc;
    console.log(`✅  User: ${u.email} (${u.role})`);
  }

  const providerDocs = {};
  for (const p of providerProfiles) {
    const user = created[p.email];
    if (!user) continue;
    const { email: _, ...provData } = p;
    const doc = await Provider.create({ ...provData, userId: user._id });
    providerDocs[p.email] = doc;
    console.log(`✅  Provider: ${p.businessName}`);
  }

  const customer = created['customer@staging.test'];
  const plumber  = providerDocs['provider@staging.test'];
  if (customer && plumber) {
    await Review.create({
      customerId: customer._id, providerId: plumber._id,
      rating: 5, review: 'Staging review: great service!',
      tags: ['punctual', 'professional'],
    });
    console.log('✅  Sample review created');
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('🌱  STAGING seeding complete! (nearby_staging)');
  console.log('');
  console.log('  customer@staging.test  / Staging@1234 (customer)');
  console.log('  provider@staging.test  / Staging@1234 (provider — Plumbing)');
  console.log('  food@staging.test      / Staging@1234 (provider — Tiffin)');
  console.log('  admin@staging.test     / Admin@1234   (admin)');
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌  Staging seed failed:', err.message);
  process.exit(1);
});
