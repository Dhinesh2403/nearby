/**
 * auth.ts — API-based auth helpers for Playwright tests.
 *
 * OTP is completely bypassed. We call POST /api/auth/login-phone directly
 * and inject the returned JWT + user object into the browser's localStorage
 * so the Angular app picks them up on next navigation.
 *
 * Seed accounts (from seed.dev.js, password: Test@1234 / Admin@1234):
 *   CUSTOMER  — phone 9000000001  (Arjun Kumar)
 *   CUSTOMER2 — phone 9000000008  (Meena Priya)
 *   PROVIDER  — phone 9000000002  (Rajan Kumar   — plumber)
 *   PROVIDER2 — phone 9000000003  (Priya Sharma  — maths tutor)
 *   ADMIN     — phone 9000000099  (Admin User)
 */

import type { Page, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:5000/api';

export const TEST_ACCOUNTS = {
  customer:  { phone: '9000000001', password: 'Test@1234', name: 'Arjun Kumar'  },
  customer2: { phone: '9000000008', password: 'Test@1234', name: 'Meena Priya'  },
  provider:  { phone: '9000000002', password: 'Test@1234', name: 'Rajan Kumar'  },
  provider2: { phone: '9000000003', password: 'Test@1234', name: 'Priya Sharma' },
  admin:     { phone: '9000000099', password: 'Admin@1234', name: 'Admin User'  },
} as const;

export type AccountKey = keyof typeof TEST_ACCOUNTS;

/** Raw API login — returns { user, accessToken, refreshToken } */
export async function apiLogin(
  request: APIRequestContext,
  account: AccountKey,
) {
  const { phone, password } = TEST_ACCOUNTS[account];
  const res = await request.post(`${API}/auth/login-phone`, {
    data: { phone, password },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `apiLogin("${account}") failed ${res.status()}: ${body}`,
    );
  }
  const json = await res.json();
  return json.data as { user: Record<string, unknown>; accessToken: string; refreshToken: string };
}

/**
 * Log the browser page in as the given seed account.
 * Injects localStorage tokens then navigates to `redirectTo` (default: '/').
 * The Angular app reads localStorage on bootstrap, so the user appears logged-in.
 */
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  account: AccountKey,
  redirectTo = '/',
) {
  const session = await apiLogin(request, account);

  // Tokens must be in localStorage before Angular bootstraps.
  // We navigate to the base URL first (blank page loads the app shell),
  // then set storage, then hard-navigate to the real destination.
  await page.goto('/');
  await page.evaluate(
    ({ user, accessToken, refreshToken }) => {
      localStorage.setItem('nb_access',  accessToken);
      localStorage.setItem('nb_refresh', refreshToken);
      localStorage.setItem('nb_user',    JSON.stringify(user));
    },
    session,
  );
  await page.goto(redirectTo);
}

/** Clear the session (simulate logout in storage only). */
export async function clearSession(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('nb_access');
    localStorage.removeItem('nb_refresh');
    localStorage.removeItem('nb_user');
  });
}
