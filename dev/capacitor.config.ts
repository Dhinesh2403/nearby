import type { CapacitorConfig } from '@capacitor/cli';

// ─── Capacitor config for NearBy Pro native app ───────────────────────────────
//
// ONE-TIME SETUP (run in NearBy/dev folder):
//   ng build
//   npx cap add android
//   npx cap sync
//
// After that, every time you change Angular code:
//   ng build && npx cap sync
//
// To open in Android Studio:
//   npx cap open android
//
// ADMOB: Replace ADMOB_APP_ID_HERE below with your real App ID from
//   admob.google.com → your app → App settings → App ID
//   Format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
// ─────────────────────────────────────────────────────────────────────────────
const config: CapacitorConfig = {
  appId: 'online.nearbypro.app',
  appName: 'NearBy Pro',
  webDir: 'dist/nearby-frontend/browser',
  android: {
    // Allows HTTP requests to localhost during dev (remove for prod)
    allowMixedContent: true,
  },
  plugins: {
    AdMob: {
      // true = Google test ads (safe, never earns real money)
      // Switch to false ONLY after entering real Ad Unit IDs in Admin panel
      initializeForTesting: true,
      // Your AdMob App ID — REQUIRED for Android build to work
      // Get it from: admob.google.com → Apps → [your app] → App settings
      appId: 'ca-app-pub-3940256099942544~3347511713',  // ← REPLACE with real App ID
    },
  },
};

export default config;
