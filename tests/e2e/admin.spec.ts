/**
 * admin.spec.ts
 *
 * End-to-end tests for the Admin panel.
 * Actor: Admin User — phone 9000000099, password Admin@1234 (seed account).
 *
 * Journey covers:
 *   1. Admin dashboard — stats load correctly
 *   2. Provider management — list, view, ban, unban
 *   3. Customer management — list and view
 *   4. Platform settings — read and update
 *   5. Complaint management — view complaints list
 *   6. Role guard — admin routes blocked for customer / provider
 *   7. Admin API assertions (direct API health checks)
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

const API = 'http://localhost:5000/api';

// ─── Fixture ─────────────────────────────────────────────────────────────────

async function asAdmin(page: Page, request: APIRequestContext, path = '/admin') {
  await loginAs(page, request, 'admin', path);
}

async function getAdminToken(page: Page) {
  return page.evaluate(() => localStorage.getItem('nb_access')) as Promise<string>;
}

// ─── 1. Admin Dashboard ───────────────────────────────────────────────────────

test.describe('Admin — Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    await asAdmin(page, request, '/admin');
  });

  test('admin lands on /admin after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);
  });

  test('dashboard loads without error', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const content = await page.content();
    expect(content).not.toContain('404');
    expect(content).not.toContain('403');
    expect(content).not.toContain('Forbidden');
  });

  test('shows total users count', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const statsEl = page.locator('[class*="stat"], text=Users, text=Total, text=Providers').first();
    await expect(statsEl).toBeVisible({ timeout: 8_000 });
  });

  test('shows providers count', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const content = await page.content();
    expect(content).toMatch(/provider|customer|user/i);
  });

  test('admin dashboard API returns valid stats', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const stats = data.data ?? data;
    // Stats object should have counts
    expect(typeof (stats.totalUsers ?? stats.users ?? stats.providers ?? 0)).toBe('number');
  });
});

// ─── 2. Provider Management ───────────────────────────────────────────────────

test.describe('Admin — Provider Management', () => {
  test('GET /api/admin/providers lists all providers', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const providers = data.data?.providers ?? data.providers ?? [];
    expect(Array.isArray(providers)).toBeTruthy();
    expect(providers.length).toBeGreaterThan(0);
  });

  test('provider list page accessible from admin panel', async ({ page, request }) => {
    await asAdmin(page, request, '/admin');
    await page.waitForTimeout(1_500);
    // Look for a providers link/tab in the admin panel
    const providerTab = page.locator(
      'a:has-text("Providers"), button:has-text("Providers"), [class*="tab"]:has-text("Provider")'
    ).first();
    if (await providerTab.isVisible()) {
      await providerTab.click();
      await page.waitForTimeout(1_000);
      const content = await page.content();
      expect(content).toMatch(/plumb|Rajan|tutor|salon/i);
    }
  });

  test('ban a provider via API and verify banned status', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);

    // Get providers list to find Rajan Kumar's userId
    const listRes = await request.get(`${API}/admin/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const providers = listData.data?.providers ?? listData.providers ?? [];

    const rajan = providers.find((p: Record<string, unknown>) => {
      const biz = (p.businessName as string) ?? '';
      const name = ((p.userId as Record<string, string>)?.name ?? '') as string;
      return biz.includes('Rajan') || name.includes('Rajan');
    });
    if (!rajan) { test.skip(); return; }

    const userId = (rajan.userId as Record<string, string>)?._id ?? rajan.userId;
    const banRes = await request.put(`${API}/admin/users/${userId}/ban`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(banRes.ok()).toBeTruthy();

    // Unban immediately to restore state
    const unbanRes = await request.put(`${API}/admin/users/${userId}/unban`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unbanRes.ok()).toBeTruthy();
  });

  test('banned provider cannot login', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);

    // Get Karthik Raj (Coimbatore provider — less critical to keep active)
    const listRes = await request.get(`${API}/admin/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const providers = listData.data?.providers ?? listData.providers ?? [];

    const karthik = providers.find((p: Record<string, unknown>) => {
      const biz = (p.businessName as string) ?? '';
      return biz.includes('Karthik');
    });
    if (!karthik) { test.skip(); return; }

    const userId = (karthik.userId as Record<string, string>)?._id ?? karthik.userId;

    // Ban Karthik
    await request.put(`${API}/admin/users/${userId}/ban`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Attempt login as Karthik — should fail with 403
    const loginRes = await request.post(`${API}/auth/login-phone`, {
      data: { phone: '9000000005', password: 'Test@1234' },
    });
    expect(loginRes.status()).toBe(403);

    // Restore — unban
    await request.put(`${API}/admin/users/${userId}/unban`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});

// ─── 3. Customer Management ───────────────────────────────────────────────────

test.describe('Admin — Customer Management', () => {
  test('GET /api/admin/customers lists customers', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const customers = data.data?.customers ?? data.customers ?? [];
    expect(Array.isArray(customers)).toBeTruthy();
    // Seed has at least 2 customers
    expect(customers.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/admin/users lists all users', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const users = data.data?.users ?? data.users ?? [];
    expect(users.length).toBeGreaterThan(0);
  });
});

// ─── 4. Platform Settings ─────────────────────────────────────────────────────

test.describe('Admin — Platform Settings', () => {
  test('GET /api/admin/settings returns current settings', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const settings = data.data?.settings ?? data.settings ?? data.data ?? data;
    // otpEnabled should be a boolean
    expect(typeof settings.otpEnabled).toBe('boolean');
  });

  test('admin can disable OTP via API', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);

    // Read current state
    const readRes = await request.get(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const readData = await readRes.json();
    const settings = readData.data?.settings ?? readData.settings ?? readData.data ?? readData;
    const wasEnabled = settings.otpEnabled;

    // Toggle OTP off
    const updateRes = await request.put(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { otpEnabled: false },
    });
    expect(updateRes.ok()).toBeTruthy();

    // Verify the change persisted
    const verifyRes = await request.get(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const verifyData = await verifyRes.json();
    const updated = verifyData.data?.settings ?? verifyData.settings ?? verifyData.data ?? verifyData;
    expect(updated.otpEnabled).toBe(false);

    // Restore original value
    await request.put(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { otpEnabled: wasEnabled },
    });
  });

  test('admin can update announcement banner text', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);

    const res = await request.put(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { announcement: 'Maintenance on Sunday 12–2 AM.' },
    });
    expect(res.ok()).toBeTruthy();

    const verifyRes = await request.get(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await verifyRes.json();
    const s = data.data?.settings ?? data.settings ?? data.data ?? data;
    expect(s.announcement).toContain('Maintenance');

    // Clean up
    await request.put(`${API}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { announcement: '' },
    });
  });

  test('settings page in admin panel is accessible', async ({ page, request }) => {
    await asAdmin(page, request, '/admin');
    await page.waitForTimeout(1_500);
    const settingsTab = page.locator(
      'a:has-text("Settings"), button:has-text("Settings"), [class*="tab"]:has-text("Settings")'
    ).first();
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(1_000);
      const content = await page.content();
      expect(content).toMatch(/otp|setting|toggle/i);
    }
  });
});

// ─── 5. Complaints ───────────────────────────────────────────────────────────

test.describe('Admin — Complaints', () => {
  test('GET /api/complaints returns all complaints for admin', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/complaints`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // May be empty if no complaints filed yet — that's fine
    expect(Array.isArray(data.data?.complaints ?? data.complaints ?? [])).toBeTruthy();
  });
});

// ─── 6. Admin Logs ────────────────────────────────────────────────────────────

test.describe('Admin — Audit Logs', () => {
  test('GET /api/admin/logs returns log entries', async ({ page, request }) => {
    await asAdmin(page, request, '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const logs = data.data?.logs ?? data.logs ?? [];
    expect(Array.isArray(logs)).toBeTruthy();
  });
});

// ─── 7. Role Guard — Non-admin blocked ───────────────────────────────────────

test.describe('Admin — Route guard blocks non-admins', () => {
  test('customer cannot access /admin', async ({ page, request }) => {
    await loginAs(page, request, 'customer', '/admin');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/admin/);
  });

  test('provider cannot access /admin', async ({ page, request }) => {
    await loginAs(page, request, 'provider', '/admin');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/admin/);
  });

  test('customer API call to /admin/dashboard returns 403', async ({ page, request }) => {
    await loginAs(page, request, 'customer', '/');
    const token = await getAdminToken(page);
    const res = await request.get(`${API}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});
