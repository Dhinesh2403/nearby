// src/seeds/migrate-highlights.js
// One-off migration: assigns sensible default highlights to existing providers
// that have none yet. Safe to re-run — skips providers that already have highlights.
//
// Run: node src/seeds/migrate-highlights.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { Provider } = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nearby_dev';

// Logic: pick 1-2 defaults based on what we know about the provider.
// isOnline → quick_response (they're reachable remotely)
// experience >= 8  → experienced
// price <= 300     → affordable
// ratingAvg >= 4.8 → experienced (strong signal)
// fallback         → quick_response
const defaultHighlights = (p) => {
  const picks = new Set();
  if (p.isOnline)           picks.add('quick_response');
  if (p.experience >= 8)    picks.add('experienced');
  if (p.ratingAvg >= 4.8)   picks.add('experienced');
  if (p.price > 0 && p.price <= 300) picks.add('affordable');
  if (picks.size === 0)     picks.add('quick_response');
  return [...picks].slice(0, 3);
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log(`✅  Connected → ${MONGO_URI}`);

  const providers = await Provider.find({ $or: [{ highlights: { $exists: false } }, { highlights: { $size: 0 } }] });
  console.log(`Found ${providers.length} provider(s) with no highlights.`);

  let updated = 0;
  for (const p of providers) {
    const highlights = defaultHighlights(p);
    await Provider.updateOne({ _id: p._id }, { highlights });
    console.log(`  → ${p.businessName}: [${highlights.join(', ')}]`);
    updated++;
  }

  console.log(`\n✅  Done — updated ${updated} provider(s).`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
