// src/seeds/seed.js
// Entry-point seed runner — delegates to the environment-specific seed file.
//
//   npm run seed          → uses NODE_ENV (defaults to development)
//   npm run seed:dev      → seed.dev.js   (nearby_dev)
//   npm run seed:staging  → seed.staging.js (nearby_staging)
//   npm run seed:prod     → seed.prod.js  (nearby_prod)

const env = process.env.NODE_ENV || 'development';

const map = {
  development: './seed.dev.js',
  staging:     './seed.staging.js',
  production:  './seed.prod.js',
};

const target = map[env];
if (!target) {
  console.error(`❌  No seed file mapped for NODE_ENV="${env}". Valid values: development, staging, production.`);
  process.exit(1);
}

console.log(`🌱  Running seed for NODE_ENV="${env}" → ${target}`);
require(target);
