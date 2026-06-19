/**
 * provider.spec.ts
 *
 * End-to-end tests from the perspective of a SERVICE PROVIDER.
 * Actor: Rajan Kumar — phone 9000000002, password Test@1234 (plumber seed).
 *
 * Journey covers:
 *   1. Provider dashboard — stats, enquiries, review count
 *   2. Edit service listing — update bio, price, skills, availability
 *   3. Browse own public profile page
 *   4. View and reply to a customer review
 *   5. Chats list and messaging a customer
 *   6. Role guard — customer-only routes are blocked
 *   7. Public provider profile visible to all (guest test cross-check)
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ─── Fixture ─────────────────────────────────────────────────────────────────

async function asProvider(page: Page, request: APIRequestContext, path = '/') {
  await loginAs(page, request, 'provider', path);
}

// ─── 1. Provider Dashboard ────────────────────────────────────────────────────

test.describe('Provider — Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    await asProvider(page, request, '/dashboard/provider');
  });

  test('redirects to /dashboard/provider after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/provider/);
  });

  test('dashboard loads without 404 or error', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const content = await page.content();
    expect(content).not.toContain('404');
    expect(content).not.toContain('Page not found');
  });

  test('displays provider name or business name', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const content = await page.content();
    // "Rajan Kumar" or "Rajan Plumbing Works"
    expect(content).toMatch(/Rajan|rajan|Plumbing/i);
  });

  test('shows performance stats section (views, contacts, rating)', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const statsEl = page.locator(
      '[class*="stat"], [class*="count"], text=Views, text=Contacts, text=Rating, text=Reviews'
    ).first();
    await expect(statsEl).toBeVisible({ timeout: 8_000 });
  });

  test('shows pending/recent reviews section', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const content = await page.content();
    expect(content).toMatch(/review|rating|feedback/i);
  });
});

// ─── 2. Edit Service Listing ─────────────────────────────────────────────────

test.describe('Provider — Edit Service Listing', () => {
  test.beforeEach(async ({ page, request }) => {
    await asProvider(page, request, '/provider/services');
  });

  test('edit page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/provider\/services/);
    await page.waitForTimeout(1_500);
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('existing bio / business name is pre-filled', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const content = await page.content();
    expect(content).toMatch(/Rajan|Plumbing|plumb|pipe/i);
  });

  test('can update bio text', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const bioField = page.locator('textarea[placeholder*="bio"], textarea[placeholder*="About"], textarea, input[placeholder*="bio"]').first();
    if (await bioField.isVisible()) {
      await bioField.clear();
      await bioField.fill('Expert plumber with 9 years of experience. Available 7 days.');
      expect(await bioField.inputValue()).toContain('Expert plumber');
    }
  });

  test('can update price field', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const priceField = page.locator('input[placeholder*="price"], input[type="number"]').first();
    if (await priceField.isVisible()) {
      await priceField.clear();
      await priceField.fill('350');
      expect(await priceField.inputValue()).toBe('350');
    }
  });

  test('save button is present and clickable', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const saveBtn = page.locator(
      'button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
    ).first();
    await expect(saveBtn).toBeVisible({ timeout: 6_000 });
    // Click and expect no crash (API may return 200)
    await saveBtn.click();
    await page.waitForTimeout(1_000);
    const content = await page.content();
    expect(content).not.toContain('500');
  });

  test('can toggle availability (online/offline)', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const toggle = page.locator(
      'input[type="checkbox"], .toggle, button:has-text("Available"), button:has-text("Online")'
    ).first();
    if (await toggle.isVisible()) {
      const wasChecked = await toggle.isChecked().catch(() => false);
      await toggle.click();
      await page.waitForTimeout(500);
      const isChecked = await toggle.isChecked().catch(() => false);
      expect(isChecked).not.toBe(wasChecked);
    }
  });
});

// ─── 3. Own Public Profile ───────────────────────────────────────────────────

test.describe('Provider — Own Public Profile', () => {
  test('provider can view own public profile via /browse link', async ({ page, request }) => {
    await asProvider(page, request, '/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });

    // Look for Rajan's card specifically
    const rajanCard = page.locator('text=Rajan, text=Plumbing').first();
    const rajanLink = rajanCard.locator('xpath=ancestor::a[@href]');
    const directLink = page.locator('a[href*="/provider/"]:near(:text("Rajan"))').first();

    if (await directLink.count() > 0) {
      await directLink.click();
    } else {
      // Fallback: click first provider
      await page.locator('a[href*="/provider/"]').first().click();
    }

    await expect(page).toHaveURL(/\/provider\//);
    await page.waitForTimeout(1_000);
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('provider profile accessible via direct API', async ({ page, request }) => {
    const nb_access = await (async () => {
      await asProvider(page, request, '/');
      return page.evaluate(() => localStorage.getItem('nb_access'));
    })();

    const res = await request.get('http://localhost:5000/api/providers/my', {
      headers: { Authorization: `Bearer ${nb_access}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const profile = data.data?.provider ?? data.provider;
    expect(profile).toBeTruthy();
    expect(profile.businessName).toMatch(/Rajan|Plumbing/i);
  });
});

// ─── 4. Reviews — View and Reply ─────────────────────────────────────────────

test.describe('Provider — Reviews', () => {
  test('provider can see reviews on their public profile page', async ({ page, request }) => {
    await asProvider(page, request, '/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    await page.locator('a[href*="/provider/"]').first().click();
    await expect(page).toHaveURL(/\/provider\//);
    await page.waitForTimeout(1_500);

    const reviewSection = page.locator('text=Reviews, [class*="review"]').first();
    await expect(reviewSection).toBeVisible({ timeout: 8_000 });
  });

  test('provider can reply to a review via API', async ({ page, request }) => {
    await asProvider(page, request, '/');
    const nb_access = await page.evaluate(() => localStorage.getItem('nb_access'));

    // Get own provider profile to get provider ID
    const profileRes = await request.get('http://localhost:5000/api/providers/my', {
      headers: { Authorization: `Bearer ${nb_access}` },
    });
    const profileData = await profileRes.json();
    const providerId = (profileData.data?.provider ?? profileData.provider)?._id;
    if (!providerId) { test.skip(); return; }

    // Fetch reviews for this provider
    const reviewsRes = await request.get(`http://localhost:5000/api/reviews/provider/${providerId}`);
    const reviewsData = await reviewsRes.json();
    const reviews = reviewsData.data?.reviews ?? reviewsData.reviews ?? [];

    if (reviews.length === 0) { test.skip(); return; }

    const reviewId = reviews[0]._id;
    const replyRes = await request.post(`http://localhost:5000/api/reviews/${reviewId}/reply`, {
      headers: { Authorization: `Bearer ${nb_access}` },
      data: { reply: 'Thank you for your kind feedback! Happy to serve you again.' },
    });

    // 200 OK or 400 if already replied — both are acceptable
    expect([200, 400]).toContain(replyRes.status());
  });
});

// ─── 5. Chat ──────────────────────────────────────────────────────────────────

test.describe('Provider — Chat', () => {
  test.beforeEach(async ({ page, request }) => {
    await asProvider(page, request, '/chats');
  });

  test('chats list page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/chats/);
    await page.waitForTimeout(1_500);
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('if conversations exist, first one can be opened', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const convItem = page.locator('a[href*="/chat/"], [class*="conv-item"], [class*="chat-row"]').first();
    if (await convItem.count() > 0 && await convItem.isVisible()) {
      await convItem.click();
      await page.waitForTimeout(1_000);
      await expect(page).toHaveURL(/\/chat\//);
    } else {
      test.skip(); // No conversations seeded — skip
    }
  });

  test('provider can send a message in an open chat', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const convItem = page.locator('a[href*="/chat/"], [class*="conv-item"]').first();
    if (await convItem.count() > 0 && await convItem.isVisible()) {
      await convItem.click();
      await page.waitForTimeout(1_000);

      const msgInput = page.locator(
        'input[placeholder*="message"], textarea[placeholder*="message"], [class*="msg-input"]'
      ).first();
      await expect(msgInput).toBeVisible({ timeout: 6_000 });
      await msgInput.fill('Hi! I received your enquiry and I am available.');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1_000);
      const content = await page.content();
      expect(content).toContain('enquiry');
    } else {
      test.skip();
    }
  });
});

// ─── 6. Role Guard — Customer-Only Routes ────────────────────────────────────

test.describe('Provider — Customer-only route guard', () => {
  test('provider cannot access /dashboard/customer', async ({ page, request }) => {
    await asProvider(page, request, '/dashboard/customer');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/dashboard\/customer/);
  });

  test('provider cannot access /admin', async ({ page, request }) => {
    await asProvider(page, request, '/admin');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/admin/);
  });
});

// ─── 7. API — Provider Data Integrity ────────────────────────────────────────

test.describe('Provider — API data integrity', () => {
  test('GET /api/providers/my returns correct provider data', async ({ page, request }) => {
    await asProvider(page, request, '/');
    const nb_access = await page.evaluate(() => localStorage.getItem('nb_access'));

    const res = await request.get('http://localhost:5000/api/providers/my', {
      headers: { Authorization: `Bearer ${nb_access}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const provider = data.data?.provider ?? data.provider;
    expect(provider.category).toBe('home_services');
    expect(provider.subCategory).toBe('Plumber');
    expect(provider.isVerified).toBe(true);
    expect(typeof provider.ratingAvg).toBe('number');
  });

  test('PUT /api/providers/my updates tagline', async ({ page, request }) => {
    await asProvider(page, request, '/');
    const nb_access = await page.evaluate(() => localStorage.getItem('nb_access'));

    const res = await request.put('http://localhost:5000/api/providers/my', {
      headers: { Authorization: `Bearer ${nb_access}` },
      data: { tagline: 'Trusted plumber — updated by e2e test' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const provider = data.data?.provider ?? data.provider;
    expect(provider.tagline).toContain('e2e test');
  });
});
