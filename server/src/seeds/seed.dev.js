// src/seeds/seed.dev.js
// Full development seed — nearby_dev
// Run: npm run seed:dev
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { User, Provider, Service, Review } = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nearby_dev';

const users = [
  { name: 'Arjun Kumar',    email: 'customer@test.com',   phone: '9000000001', password: 'Test@1234',  role: 'customer', district: 'Chennai',     area: 'Anna Nagar'  },
  { name: 'Meena Priya',    email: 'customer2@test.com',  phone: '9000000008', password: 'Test@1234',  role: 'customer', district: 'Chennai',     area: 'Velachery'   },
  { name: 'Rajan Kumar',    email: 'provider@test.com',   phone: '9000000002', password: 'Test@1234',  role: 'provider', district: 'Chennai',     area: 'Anna Nagar'  },
  { name: 'Priya Sharma',   email: 'priya@test.com',      phone: '9000000003', password: 'Test@1234',  role: 'provider', district: 'Chennai',     area: 'T. Nagar'    },
  { name: 'Amma Lakshmi',   email: 'amma@test.com',       phone: '9000000004', password: 'Test@1234',  role: 'provider', district: 'Chennai',     area: 'Adyar'       },
  { name: 'Karthik Raj',    email: 'karthik@test.com',    phone: '9000000005', password: 'Test@1234',  role: 'provider', district: 'Coimbatore', area: 'Gandhipuram' },
  { name: 'Sunita Devi',    email: 'sunita@test.com',     phone: '9000000006', password: 'Test@1234',  role: 'provider', district: 'Chennai',     area: 'Velachery'   },
  { name: 'Vikram Salon',   email: 'vikram@test.com',     phone: '9000000007', password: 'Test@1234',  role: 'provider', district: 'Chennai',     area: 'Mylapore'    },
  { name: 'Admin User',     email: 'admin@test.com',      phone: '9000000099', password: 'Admin@1234', role: 'admin',    district: 'Chennai',     area: 'Egmore'      },
];

const providerProfiles = [
  {
    email: 'provider@test.com',
    businessName: 'Rajan Plumbing Works', tagline: 'Trusted since 2015',
    category: 'home_services', subCategory: 'Plumber',
    skills: ['Pipe Fitting', 'Drain Cleaning', 'Tap Installation', 'Water Heater'],
    highlights: ['experienced', 'affordable', 'home_visits'],
    experience: 9, price: 299, priceMax: 1500, isVerified: true, isOnline: false, status: 'active',
    bio: 'Expert in pipe fitting, drain cleaning, tap installation and water heater repair. Available 7 days a week.',
    ratingAvg: 4.8, ratingCount: 124,
  },
  {
    email: 'priya@test.com',
    businessName: 'Priya Maths Tutor', tagline: 'CBSE & ICSE specialist',
    category: 'education', subCategory: 'Maths Tutor',
    skills: ['CBSE Maths', 'ICSE Maths', 'JEE Foundation', 'Olympiad Prep'],
    highlights: ['quick_response', 'free_consultation'],
    experience: 6, price: 800, isVerified: true, isOnline: true, status: 'active',
    bio: 'M.Sc Mathematics. Taught 200+ students from Class 6 to 12. Online and home visit.',
    ratingAvg: 4.9, ratingCount: 89,
  },
  {
    email: 'amma@test.com',
    businessName: "Amma's Tiffin Service", tagline: 'Home food, delivered fresh',
    category: 'food', subCategory: 'Tiffin Service',
    skills: ['South Indian', 'Veg Meals', 'Diet Tiffin', 'Monthly Plans'],
    highlights: ['affordable', 'home_visits'],
    experience: 4, price: 80, priceMax: 350, isVerified: true, isOnline: false, status: 'active',
    bio: 'Fresh, hygienic home-cooked South Indian meals. Lunch and dinner tiffin. Monthly packages available.',
    ratingAvg: 4.7, ratingCount: 203,
  },
  {
    email: 'karthik@test.com',
    businessName: 'Karthik Electricals', tagline: 'Safe & certified wiring',
    category: 'home_services', subCategory: 'Electrician',
    skills: ['Wiring', 'Switchboard', 'AC Installation', 'Fan Fixing'],
    highlights: ['experienced', 'emergency_24x7', 'affordable'],
    experience: 11, price: 250, priceMax: 1200, isVerified: true, isOnline: false, status: 'active',
    bio: 'Licensed electrician. Wiring, switchboard, fan and AC installation.',
    ratingAvg: 4.6, ratingCount: 67,
  },
  {
    email: 'sunita@test.com',
    businessName: 'Sunita Yoga Studio', tagline: 'Balance body & mind',
    category: 'wellness', subCategory: 'Yoga Trainer',
    skills: ['Hatha Yoga', 'Vinyasa', 'Pranayama', 'Meditation'],
    highlights: ['quick_response', 'experienced'],
    experience: 8, price: 600, isVerified: true, isOnline: true, status: 'active',
    bio: 'Certified yoga instructor. Group and personal sessions. Online available.',
    ratingAvg: 5.0, ratingCount: 44,
  },
  {
    email: 'vikram@test.com',
    businessName: "Vikram's Gents Salon", tagline: 'Modern cuts, traditional care',
    category: 'beauty_salon', subCategory: 'Gents Salon',
    skills: ['Haircut', 'Beard Trim', 'Facial', 'Head Massage'],
    highlights: ['affordable', 'free_consultation'],
    experience: 7, price: 120, priceMax: 500, isVerified: true, isOnline: false, status: 'active',
    bio: 'Professional gents salon with modern equipment. Walk-ins welcome.',
    ratingAvg: 4.5, ratingCount: 38,
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
  await Service.deleteMany({});
  await Review.deleteMany({});

  const created = {};
  for (const u of users) {
    const doc = await User.create({
      name: u.name, email: u.email, phone: u.phone,
      passwordHash: u.password,
      hasPassword: true,
      role: u.role,
      location: {
        type: 'Point',
        coordinates: [80.2707 + (Math.random() - 0.5) * 0.1, 13.0827 + (Math.random() - 0.5) * 0.1],
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

  const customer = created['customer@test.com'];
  const rajan    = providerDocs['provider@test.com'];
  const priya    = providerDocs['priya@test.com'];

  if (customer && rajan) {
    await Review.create({
      customerId: customer._id, providerId: rajan._id,
      rating: 5, review: 'Excellent work! Fixed the pipe in under an hour. Very professional.',
      tags: ['punctual', 'professional', 'clean_work'],
    });
    await Review.create({
      customerId: customer._id, providerId: rajan._id,
      rating: 4, review: 'Good service but slightly delayed. Overall happy with the work.',
      tags: ['professional'],
    });
  }
  if (customer && priya) {
    await Review.create({
      customerId: customer._id, providerId: priya._id,
      rating: 5, review: 'My son improved from C to A+ in three months. Highly recommended!',
      tags: ['patient', 'knowledgeable'],
    });
  }
  console.log('✅  Sample reviews created');

  console.log('\n─────────────────────────────────────────────────');
  console.log('🌱  DEV seeding complete! (nearby_dev)');
  console.log('');
  console.log('  customer@test.com   / Test@1234  (customer)');
  console.log('  customer2@test.com  / Test@1234  (customer)');
  console.log('  provider@test.com   / Test@1234  (provider — Rajan Plumbing)');
  console.log('  priya@test.com      / Test@1234  (provider — Priya Maths)');
  console.log('  amma@test.com       / Test@1234  (provider — Tiffin)');
  console.log('  karthik@test.com    / Test@1234  (provider — Electricals)');
  console.log('  sunita@test.com     / Test@1234  (provider — Yoga)');
  console.log('  vikram@test.com     / Test@1234  (provider — Salon)');
  console.log('  admin@test.com      / Admin@1234 (admin)');
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
