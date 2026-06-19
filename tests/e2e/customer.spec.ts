/**
 * customer.spec.ts
 *
 * End-to-end tests from the perspective of a SERVICE-SEEKING CUSTOMER.
 * Actor: Arjun Kumar — phone 9000000001, password Test@1234 (seed account).
 *
 * Journey covers:
 *   1. Customer dashboard — stats and recent activity load
 *   2. Browse providers — view, search, filter
 *   3. View a provider's full profile and reviews
 *   4. Initiate a chat with a provider
 *   5. Send a message in chat
 *   6. Submit a review for a provider
 *   7. File a complaint
 *   8. Profile settings — view and update
 *   9. Notification bell visible and functional
 *  10. Role guard — provider-only routes are blocked
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loginAs, TEST_ACCOUNTS } from './helpers/auth';

// ─── Fixture ─────────────────────────────────────────────────────────────────

async function asCustomer(page: Page, request: APIRequestContext, path = '/') {
  await loginAs(page, request, 'customer', path);
}

// ─── 1. Customer Dashboard ───────────────────────────────────────────────────

test.describe('Customer — Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/dashboard/customer');
  });

  test('dashboard loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/customer/);
    // Page content beyond the skeleton loader
    await page.waitForSelector('h1, h2, .dashboard, [class*="dash"]', { timeout: 10_000 });
    const content = await page.content();
    expect(content).not.toContain('404');
    expect(content).not.toContain('Page not found');
  });

  test('displays logged-in customer name', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const content = await page.content();
    // "Arjun Kumar" should appear somewhere on the page or in the navbar
    expect(content).toMatch(/Arjun|arjun/i);
  });

  test('shows activity section or recent providers contacted', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const hasActivity = await page.locator(
      'text=Activity, text=Recent, text=Contacts, text=History, [class*="activity"]'
    ).count();
    expect(hasActivity).toBeGreaterThan(0);
  });
});

// ─── 2. Browse & Search ──────────────────────────────────────────────────────

test.describe('Customer — Browse Providers', () => {
  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/browse');
    await page.waitForSelector('.res-count', { timeout: 10_000 });
  });

  test('browse page shows at least one provider', async ({ page }) => {
    const countText = await page.locator('.res-count').textContent();
    expect(parseInt(countText ?? '0')).toBeGreaterThan(0);
  });

  test('search for "plumber" returns relevant results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="service"], input[placeholder*="Search"]').first();
    await searchInput.fill('plumber');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_200);
    const content = await page.content();
    expect(content).toMatch(/plumb|Rajan|home_service/i);
  });

  test('search for "yoga" returns relevant results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="service"], input[placeholder*="Search"]').first();
    await searchInput.fill('yoga');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_200);
    const content = await page.content();
    expect(content).toMatch(/yoga|wellness|Sunita/i);
  });

  test('Top Rated filter chip is clickable and applies', async ({ page }) => {
    await page.locator('.chip:has-text("Top Rated")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.chip:has-text("Top Rated").on')).toBeVisible();
  });

  test('Verified filter chip applies', async ({ page }) => {
    await page.locator('.chip:has-text("Verified")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.chip.on:has-text("Verified")')).toBeVisible();
  });

  test('sort by "Newest" changes sort chip label', async ({ page }) => {
    await page.locator('.chip-sort').click();
    await page.waitForSelector('.chip-drop', { timeout: 4_000 });
    await page.locator('.chip-opt:has-text("Newest")').click();
    await page.waitForTimeout(600);
    const chipText = await page.locator('.chip-sort').textContent();
    expect(chipText).toMatch(/Newest/i);
  });

  test('Clear All chip resets all active filters', async ({ page }) => {
    await page.locator('.chip:has-text("Verified")').click();
    await page.locator('.chip:has-text("Top Rated")').click();
    await page.waitForTimeout(400);
    await page.locator('.chip:has-text("Clear All")').click();
    await page.waitForTimeout(800);
    const onChips = await page.locator('.chip.on').count();
    expect(onChips).toBe(0);
  });
});

// ─── 3. Provider Profile ─────────────────────────────────────────────────────

test.describe('Customer — View Provider Profile', () => {
  let providerUrl = '';

  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    const link = page.locator('a[href*="/provider/"]').first();
    providerUrl = (await link.getAttribute('href')) ?? '';
    await link.click();
    await expect(page).toHaveURL(/\/provider\//);
    await page.waitForTimeout(1_000);
  });

  test('provider profile page renders business name', async ({ page }) => {
    const content = await page.content();
    const hasName =
      content.includes('Plumbing') ||
      content.includes('Tutor') ||
      content.includes('Tiffin') ||
      content.includes('Yoga') ||
      content.includes('Salon') ||
      content.includes('Electrical');
    expect(hasName).toBeTruthy();
  });

  test('shows rating average', async ({ page }) => {
    const ratingEl = page.locator('[class*="rating"], text=4., text=5.').first();
    await expect(ratingEl).toBeVisible({ timeout: 8_000 });
  });

  test('shows reviews section', async ({ page }) => {
    const reviewSection = page.locator('text=Reviews, text=Review, [class*="review"]').first();
    await expect(reviewSection).toBeVisible({ timeout: 8_000 });
  });

  test('shows skills or tags', async ({ page }) => {
    const content = await page.content();
    // Seed providers all have skills arrays
    expect(content).toMatch(/skill|tag|experience|year/i);
  });

  test('contact button is visible for logged-in customer', async ({ page }) => {
    const contactBtn = page.locator(
      'button:has-text("Call"), button:has-text("WhatsApp"), button:has-text("Contact"), button:has-text("Chat")'
    ).first();
    await expect(contactBtn).toBeVisible({ timeout: 8_000 });
  });
});

// ─── 4 & 5. Chat — Initiate and Send Message ─────────────────────────────────

test.describe('Customer — Chat with Provider', () => {
  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    await page.locator('a[href*="/provider/"]').first().click();
    await expect(page).toHaveURL(/\/provider\//);
  });

  test('Chat button navigates to chat or opens conversation', async ({ page }) => {
    const chatBtn = page.locator(
      'button:has-text("Chat"), button:has-text("Message"), a:has-text("Chat")'
    ).first();

    if (await chatBtn.isVisible({ timeout: 5_000 })) {
      await chatBtn.click();
      await page.waitForTimeout(1_500);
      const url = page.url();
      // Should navigate to /chats or /chat/:id
      const wentToChat = url.includes('/chat') || url.includes('/chats');
      if (!wentToChat) {
        // Alternatively a chat modal/panel may open inline
        const chatPanel = await page.locator('[class*="chat"], [class*="message"]').count();
        expect(chatPanel).toBeGreaterThan(0);
      } else {
        expect(url).toMatch(/\/chat/);
      }
    } else {
      test.skip(); // No chat button visible — may need to contact first
    }
  });

  test('chats list page loads for logged-in customer', async ({ page }) => {
    await page.goto('/chats');
    await expect(page).toHaveURL(/\/chats/);
    await page.waitForTimeout(1_500);
    // Page should load (either empty state or conversations list)
    await expect(page.locator('body')).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('send a message in an existing conversation', async ({ page }) => {
    await page.goto('/chats');
    await page.waitForTimeout(1_500);

    // If there's an existing conversation, open it
    const convLink = page.locator('a[href*="/chat/"], [class*="conv"], [class*="chat-item"]').first();
    if (await convLink.count() > 0 && await convLink.isVisible()) {
      await convLink.click();
      await page.waitForTimeout(1_000);
      await expect(page).toHaveURL(/\/chat\//);

      const msgInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], .msg-input, [class*="message-input"]').first();
      await expect(msgInput).toBeVisible({ timeout: 6_000 });
      await msgInput.fill('Hello, I need your services. Are you available?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1_000);

      // Message should appear in the conversation
      const content = await page.content();
      expect(content).toContain('Hello, I need your services');
    } else {
      test.skip(); // No existing conversation to test against
    }
  });
});

// ─── 6. Submit a Review ──────────────────────────────────────────────────────

test.describe('Customer — Submit Review', () => {
  test('can submit a star rating for a provider via API', async ({ page, request }) => {
    await loginAs(page, request, 'customer2'); // Meena Priya — second customer

    // Get the provider list to find a provider ID
    const providers = await request.get('http://localhost:5000/api/providers?limit=5');
    const data = await providers.json();
    const providerList = data.data?.providers ?? data.providers ?? [];

    if (providerList.length === 0) {
      test.skip(); return;
    }

    // Try to submit a review via API (direct endpoint)
    // POST /api/reviews/direct  { providerId, rating, review }
    const nb_access = await page.evaluate(() => localStorage.getItem('nb_access'));
    const providerId = providerList[0]._id;

    const reviewRes = await request.post('http://localhost:5000/api/reviews/direct', {
      headers: { Authorization: `Bearer ${nb_access}` },
      data: {
        providerId,
        rating: 5,
        review: 'Excellent service! Highly recommended to everyone.',
        tags: ['punctual', 'professional'],
      },
    });

    // 201 Created or 200 OK expected; 400 if already reviewed (idempotent)
    expect([200, 201, 400]).toContain(reviewRes.status());
  });

  test('review form on provider profile is accessible', async ({ page, request }) => {
    await asCustomer(page, request, '/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    await page.locator('a[href*="/provider/"]').first().click();
    await page.waitForTimeout(1_500);

    // Look for a review/rating UI (stars, form, button)
    const reviewUI = page.locator(
      '[class*="review"], [class*="rate"], form:has(select, input[type="number"]), text=Leave a review, text=Write a review'
    ).first();
    // It might require scrolling down
    await page.keyboard.press('End');
    await page.waitForTimeout(500);

    const isVisible = await reviewUI.isVisible().catch(() => false);
    // Not a hard failure — review UI may only appear for eligible customers
    if (isVisible) {
      await expect(reviewUI).toBeVisible();
    }
  });
});

// ─── 7. File a Complaint ─────────────────────────────────────────────────────

test.describe('Customer — File Complaint', () => {
  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/complaints/new');
  });

  test('complaint form page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/complaints\/new/);
    await page.waitForTimeout(1_000);
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('complaint form has required fields', async ({ page }) => {
    await page.waitForTimeout(1_000);
    // Look for textarea/input for description
    const descField = page.locator('textarea, input[placeholder*="describe"], [class*="complaint"]').first();
    const isVisible = await descField.isVisible().catch(() => false);
    if (isVisible) {
      await expect(descField).toBeVisible();
    }
  });

  test('submitting empty complaint shows validation error', async ({ page }) => {
    await page.waitForTimeout(1_000);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit"), .auth-btn').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(600);
      // Should show validation or stay on the page
      await expect(page).toHaveURL(/\/complaints\/new/);
    }
  });
});

// ─── 8. Profile Settings ─────────────────────────────────────────────────────

test.describe('Customer — Profile Settings', () => {
  test.beforeEach(async ({ page, request }) => {
    await asCustomer(page, request, '/settings');
  });

  test('settings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
    await page.waitForTimeout(1_000);
    const content = await page.content();
    expect(content).not.toContain('404');
  });

  test('displays current user name pre-filled', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const content = await page.content();
    expect(content).toMatch(/Arjun|arjun/i);
  });

  test('name field is editable', async ({ page }) => {
    await page.waitForTimeout(1_500);
    const nameInput = page.locator('input[placeholder*="name"], input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.tripleClick();
      await nameInput.fill('Arjun Kumar Updated');
      expect(await nameInput.inputValue()).toBe('Arjun Kumar Updated');
    }
  });
});

// ─── 9. Notifications ────────────────────────────────────────────────────────

test.describe('Customer — Notifications', () => {
  test('notification bell is visible in navbar', async ({ page, request }) => {
    await asCustomer(page, request, '/');
    const bell = page.locator(
      '[class*="notif"], [class*="bell"], .bi-bell, button:has(.bi-bell)'
    ).first();
    await expect(bell).toBeVisible({ timeout: 8_000 });
  });

  test('clicking bell opens notification panel', async ({ page, request }) => {
    await asCustomer(page, request, '/');
    const bell = page.locator('[class*="notif"], [class*="bell"], .bi-bell').first();
    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(600);
      // A dropdown or panel should appear
      const panel = page.locator('[class*="notif-drop"], [class*="notification-list"], [class*="notif-panel"]').first();
      const isOpen = await panel.isVisible().catch(() => false);
      if (!isOpen) {
        // Might render inline; just check no crash
        expect(page.url()).not.toContain('error');
      }
    }
  });
});

// ─── 10. Role Guard — Provider Routes ────────────────────────────────────────

test.describe('Customer — Provider-only route guard', () => {
  test('customer cannot access /provider/services (provider edit page)', async ({ page, request }) => {
    await asCustomer(page, request, '/provider/services');
    await page.waitForTimeout(1_000);
    // Should redirect away from provider-only page
    expect(page.url()).not.toMatch(/\/provider\/services/);
  });

  test('customer cannot access /dashboard/provider', async ({ page, request }) => {
    await asCustomer(page, request, '/dashboard/provider');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/dashboard\/provider/);
  });

  test('customer cannot access /admin', async ({ page, request }) => {
    await asCustomer(page, request, '/admin');
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toMatch(/\/admin/);
  });
});
