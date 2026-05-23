// src/seeds/seed.js
// Seeds local MongoDB with demo users, providers, and bookings
// Run: node src/seeds/seed.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const { User, Provider, Service, Booking, Review } = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nearby';

// ── SEED DATA ─────────────────────────────────────────────────
const users = [
  { name: 'Arjun Kumar',   email: 'customer@test.com', phone: '9000000001', password: 'Test@1234',  role: 'customer' },
  { name: 'Rajan Kumar',   email: 'provider@test.com', phone: '9000000002', password: 'Test@1234',  role: 'provider' },
  { name: 'Priya Sharma',  email: 'priya@test.com',    phone: '9000000003', password: 'Test@1234',  role: 'provider' },
  { name: 'Amma Lakshmi',  email: 'amma@test.com',     phone: '9000000004', password: 'Test@1234',  role: 'provider' },
  { name: 'Karthik Raj',   email: 'karthik@test.com',  phone: '9000000005', password: 'Test@1234',  role: 'provider' },
  { name: 'Sunita Devi',   email: 'sunita@test.com',   phone: '9000000006', password: 'Test@1234',  role: 'provider' },
  { name: 'Admin User',    email: 'admin@test.com',    phone: '9000000099', password: 'Admin@1234', role: 'admin' },
];

const providerProfiles = [
  {
    email: 'provider@test.com',
    businessName: 'Rajan Plumbing Works', tagline: 'Trusted since 2015',
    category: 'home_services', subCategory: 'Plumber',
    skills: ['Pipe Fitting','Drain Cleaning','Tap Installation','Water Heater'],
    experience: 9, price: 499, isVerified: true, isOnline: false, status: 'active',
    bio: 'Expert in pipe fitting, drain cleaning, tap installation and water heater repair. Available 7 days a week.',
    ratingAvg: 4.8, ratingCount: 124, totalBookings: 340,
  },
  {
    email: 'priya@test.com',
    businessName: 'Priya Maths Tutor', tagline: 'CBSE & ICSE specialist',
    category: 'education', subCategory: 'Maths Tutor',
    skills: ['CBSE Maths','ICSE Maths','JEE Foundation','Olympiad Prep'],
    experience: 6, price: 800, isVerified: true, isOnline: true, status: 'active',
    bio: 'M.Sc Mathematics. Taught 200+ students from Class 6 to 12. Online and home visit.',
    ratingAvg: 4.9, ratingCount: 89, totalBookings: 210,
  },
  {
    email: 'amma@test.com',
    businessName: "Amma's Tiffin Service", tagline: 'Home food, delivered fresh',
    category: 'food', subCategory: 'Tiffin Service',
    skills: ['South Indian','Veg Meals','Diet Tiffin','Monthly Plans'],
    experience: 4, price: 120, isVerified: true, isOnline: false, status: 'active',
    bio: 'Fresh, hygienic home-cooked South Indian meals. Lunch and dinner tiffin. Monthly packages available.',
    ratingAvg: 4.7, ratingCount: 203, totalBookings: 1200,
  },
  {
    email: 'karthik@test.com',
    businessName: 'Karthik Electricals', tagline: 'Safe & certified wiring',
    category: 'home_services', subCategory: 'Electrician',
    skills: ['Wiring','Switchboard','AC Installation','Fan Fixing'],
    experience: 11, price: 399, isVerified: true, isOnline: false, status: 'active',
    bio: 'Licensed electrician. Wiring, switchboard, fan and AC installation.',
    ratingAvg: 4.6, ratingCount: 67, totalBookings: 180,
  },
  {
    email: 'sunita@test.com',
    businessName: 'Sunita Yoga Studio', tagline: 'Balance body & mind',
    category: 'wellness', subCategory: 'Yoga Trainer',
    skills: ['Hatha Yoga','Vinyasa','Pranayama','Meditation'],
    experience: 8, price: 600, isVerified: true, isOnline: true, status: 'active',
    bio: 'Certified yoga instructor. Group and personal sessions. Online available.',
    ratingAvg: 5.0, ratingCount: 44, totalBookings: 95,
  },
];

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // ── CLEAR EXISTING SEED DATA ───────────────────────────────
  const emails = users.map(u => u.email);
  const existingUsers = await User.find({ email: { $in: emails } });
  const existingIds   = existingUsers.map(u => u._id);

  await User.deleteMany({ email: { $in: emails } });
  await Provider.deleteMany({ userId: { $in: existingIds } });
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await Review.deleteMany({});
  console.log('🗑️   Cleared old seed data');

  // ── CREATE USERS ──────────────────────────────────────────
  const created = {};
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const doc  = await User.create({
      name: u.name, email: u.email, phone: u.phone,
      password: u.password,
      passwordHash: hash,
      role: u.role,
      location: {
        type: 'Point',
        coordinates: [80.2707 + (Math.random() - 0.5) * 0.1, 13.0827 + (Math.random() - 0.5) * 0.1],
        address: 'Chennai', city: 'Chennai', pincode: '600001',
      },
    });
    created[u.email] = doc;
    console.log(`✅  User: ${u.email} (${u.role})`);
  }

  // ── CREATE PROVIDER PROFILES ─────────────────────────────
  const providerDocs = {};
  for (const p of providerProfiles) {
    const user = created[p.email];
    if (!user) continue;
    const { email: _, ...provData } = p;
    const doc = await Provider.create({ ...provData, userId: user._id });
    providerDocs[p.email] = doc;
    console.log(`✅  Provider: ${p.businessName}`);
  }

  // ── CREATE SAMPLE BOOKINGS ────────────────────────────────
  const customer = created['customer@test.com'];
  const rajan    = providerDocs['provider@test.com'];

  if (customer && rajan) {
    const b1 = await Booking.create({
      customerId:    customer._id,
      providerId:    rajan._id,
      bookingType:   'in_person',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      scheduledTime: '10:00',
      address:       '12 Anna Nagar, Chennai',
      status:        'accepted',
      notes:         'Please bring extra fittings',
    });

    const b2 = await Booking.create({
      customerId:    customer._id,
      providerId:    rajan._id,
      bookingType:   'in_person',
      scheduledDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      scheduledTime: '14:00',
      address:       '12 Anna Nagar, Chennai',
      status:        'completed',
      completedAt:   new Date(),
    });

    // Add a review for the completed booking
    await Review.create({
      bookingId:  b2._id,
      customerId: customer._id,
      providerId: rajan._id,
      rating:     5,
      review:     'Excellent work! Fixed the pipe in under an hour. Very professional.',
      tags:       ['punctual','professional','clean_work'],
    });

    console.log('✅  Sample bookings and review created');
  }

  // ── SUMMARY ──────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────');
  console.log('🌱  Seeding complete!');
  console.log('');
  console.log('  Login credentials:');
  console.log('  customer@test.com  / Test@1234  (customer)');
  console.log('  provider@test.com  / Test@1234  (provider)');
  console.log('  admin@test.com     / Admin@1234 (admin)');
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
