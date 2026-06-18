// src/config/firebase.js
// Firebase Admin SDK — used to verify Firebase ID tokens minted by the
// frontend Phone Auth flow. Verification happens server-side so a client
// cannot forge a "verified phone" claim.
//
// ─────────────────────────────────────────────────────────────────────
// HOW TO FILL THE CREDENTIALS (one of two ways):
//
// 1) Service-account JSON file (recommended for local dev):
//    - Firebase console → Project settings → Service accounts →
//      "Generate new private key" → download the JSON.
//    - Save it as  server/firebase-service-account.json  (git-ignored).
//    - Set in .env:  FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
//
// 2) Inline env vars (recommended for hosted deploys like Render/Railway):
//    - Set these three in the environment:
//        FIREBASE_PROJECT_ID
//        FIREBASE_CLIENT_EMAIL
//        FIREBASE_PRIVATE_KEY   (paste the full key; keep the \n escapes)
//
// If NEITHER is configured, the SDK is left uninitialised and
// isFirebaseEnabled() returns false — the verify endpoint then responds
// with a clear 503 instead of crashing, so the rest of the app still runs.
// ─────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');

let initialised = false;

function init() {
  if (initialised) return;

  try {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

    if (path) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const serviceAccount = require(require('path').resolve(path));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      initialised = true;
      console.log('🔥  Firebase Admin initialised (service-account file)');
    } else if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // env vars store the key with literal "\n" — convert back to real newlines
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      initialised = true;
      console.log('🔥  Firebase Admin initialised (inline env credentials)');
    } else {
      console.warn('⚠️   Firebase not configured — phone OTP verify endpoint will return 503. ' +
        'Fill FIREBASE_* vars in .env to enable.');
    }
  } catch (err) {
    console.error('🔥  Firebase Admin init failed:', err.message);
  }
}

init();

const isFirebaseEnabled = () => initialised;

// Verify a Firebase ID token; resolves to the decoded token (incl. phone_number).
const verifyIdToken = (idToken) => admin.auth().verifyIdToken(idToken);

module.exports = { admin, isFirebaseEnabled, verifyIdToken };
