import { defineConfig, devices } from '@playwright/test';

/**
 * NearBy E2E test configuration.
 *
 * Prerequisites:
 *   1. Backend running:  cd server && npm run dev   (port 5000)
 *   2. Frontend running: cd dev   && npm start      (port 4200)
 *   3. DB seeded:        npm run seed               (creates test accounts)
 *
 * OTP is bypassed: tests use password login via POST /api/auth/login-phone.
 * Ensure seed sets hasPassword: true (already done in seed.dev.js).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,          // tests share DB state — run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL:            'http://localhost:4200',
    trace:              'on-first-retry',
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    actionTimeout:      10_000,
    navigationTimeout:  20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
