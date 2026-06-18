// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  socketUrl: 'http://localhost:5000',
  appName: 'NearBy',

  // ── FIREBASE PHONE AUTH ──────────────────────────────────────
  // Firebase console → Project settings → General → "Your apps" →
  // Web app → SDK setup and configuration → copy the firebaseConfig values.
  // Also enable: Authentication → Sign-in method → Phone.
  // For localhost testing add "localhost" under Authentication → Settings →
  // Authorized domains (it's there by default).
  // ── GOOGLE ADSENSE ───────────────────────────────────────────
  // After AdSense approval, paste your Publisher ID below.
  // Get it from: adsense.google.com → Account → Account information
  adsense: {
    publisherId: 'ca-pub-6613739357752442',
    // Ad slot IDs from adsense.google.com → Ads → By ad unit
    slots: {
      browseBanner:   '0000000001',   // ← REPLACE with real slot IDs
      providerBanner: '0000000002',
      sidebar:        '0000000003',
    },
    enabled: false,   // flip to true once AdSense is approved + IDs are real
  },

  firebase: {
    apiKey: "AIzaSyBQeynUVee5L_4CrqfYgAmB-FRoQeMVaT4",
    authDomain: "nearby-b43ea.firebaseapp.com",
    projectId: "nearby-b43ea",
    storageBucket: "nearby-b43ea.firebasestorage.app",
    messagingSenderId: "747048423700",
    appId: "1:747048423700:web:3947adae6a62709639f201",
    measurementId: "G-5BYM62KBD0"
  },

};
