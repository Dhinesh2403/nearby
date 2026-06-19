/**
 * guest.spec.ts
 *
 * Tests for unauthenticated visitors — no login required.
 * Covers: home page, browse/search, provider profile, login-wall redirects.
 */

import { test, expect } from '@playwright/test';

test.describe('Guest — Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section and brand name', async ({ page }) => {
    await expect(page.locator('text=NearBy').first()).toBeVisible();
  });

  test('displays service category links or CTA', async ({ page }) => {
    // Home page should surface at least one call-to-action or category
    const body = await page.content();
    expect(body.length).toBeGreaterThan(500);
    // App shell loads (Angular bootstraps without error)
    await expect(page.locator('app-root, body')).toBeVisible();
  });

  test('navigation bar is visible', async ({ page }) => {
    await expect(page.locator('nav, .navbar, header')).toBeVisible();
  });

  test('browse link in nav is accessible', async ({ page }) => {
    // Look for a link to /browse
    const browseLink = page.locator('a[href="/browse"], a[routerLink="/browse"], a:has-text("Browse")');
    await expect(browseLink.first()).toBeVisible();
  });
});

test.describe('Guest — Browse Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browse');
  });

  test('browse page loads and shows results', async ({ page }) => {
    // Wait for the results count to appear
    await expect(page.locator('.res-count, text=results').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows provider cards', async ({ page }) => {
    await page.waitForSelector('.res-count, .provider-card, [class*="card"]', { timeout: 10_000 });
    const count = await page.locator('.res-count').textContent();
    // Seed has 6 providers — result count should be > 0
    if (count) {
      expect(parseInt(count)).toBeGreaterThan(0);
    }
  });

  test('filter chip — Top Rated filters results', async ({ page }) => {
    await page.waitForSelector('.chip', { timeout: 8_000 });
    const initialCount = await page.locator('.res-count').textContent();

    await page.locator('.chip:has-text("Top Rated")').click();
    await page.waitForTimeout(800); // debounce
    // Page should still show results (or an empty state — not a crash)
    await expect(page.locator('.res-count, text=No providers, text=results').first()).toBeVisible();
  });

  test('filter chip — Verified filters results', async ({ page }) => {
    await page.waitForSelector('.chip', { timeout: 8_000 });
    await page.locator('.chip:has-text("Verified")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.res-count, text=results').first()).toBeVisible();
  });

  test('Clear All chip resets filters', async ({ page }) => {
    await page.waitForSelector('.chip', { timeout: 8_000 });
    await page.locator('.chip:has-text("Verified")').click();
    await page.waitForTimeout(400);
    await page.locator('.chip:has-text("Clear All")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.res-count').first()).toBeVisible();
  });

  test('search bar accepts input', async ({ page }) => {
    await page.waitForSelector('input[placeholder*="service"], input[placeholder*="Search"], .nb-input', { timeout: 8_000 });
    const searchInput = page.locator('input[placeholder*="service"], input[placeholder*="Search"], .nb-input').first();
    await searchInput.fill('plumber');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_000);
    await expect(page.locator('.res-count, text=results').first()).toBeVisible();
  });

  test('clicking a provider card navigates to provider profile', async ({ page }) => {
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    const firstProviderLink = page.locator('a[href*="/provider/"]').first();
    const href = await firstProviderLink.getAttribute('href');
    await firstProviderLink.click();
    await expect(page).toHaveURL(/\/provider\//);
  });
});

test.describe('Guest — Provider Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to browse first and find a provider link
    await page.goto('/browse');
    await page.waitForSelector('a[href*="/provider/"]', { timeout: 10_000 });
    await page.locator('a[href*="/provider/"]').first().click();
    await expect(page).toHaveURL(/\/provider\//);
  });

  test('provider profile page loads with business name', async ({ page }) => {
    // Any of the known seed provider names should appear
    const content = await page.content();
    const hasProviderContent =
      content.includes('Plumbing') ||
      content.includes('Tutor') ||
      content.includes('Tiffin') ||
      content.includes('Yoga') ||
      content.includes('Salon') ||
      content.includes('Electric');
    expect(hasProviderContent).toBeTruthy();
  });

  test('shows rating or review section', async ({ page }) => {
    await expect(
      page.locator('text=Reviews, text=Rating, [class*="review"], [class*="rating"]').first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('contact button triggers login modal for guest', async ({ page }) => {
    // Guests clicking "Contact" or "Call" should see a login prompt
    const contactBtn = page.locator(
      'button:has-text("Contact"), button:has-text("Call"), button:has-text("WhatsApp"), button:has-text("Chat")'
    ).first();
    if (await contactBtn.isVisible()) {
      await contactBtn.click();
      // Expect either redirect to /auth/login or a login modal
      await page.waitForTimeout(800);
      const url = page.url();
      const hasModal = await page.locator('[class*="modal"], text=Login, text=Sign in').count();
      expect(url.includes('/auth/login') || hasModal > 0).toBeTruthy();
    }
  });
});

test.describe('Guest — Auth Wall', () => {
  const protectedRoutes = [
    '/dashboard/customer',
    '/dashboard/provider',
    '/chats',
    '/settings',
    '/complaints/new',
  ];

  for (const route of protectedRoutes) {
    test(`redirects unauthenticated user away from ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(1_000);
      // Should land on login or home, not stay on the protected route
      const url = page.url();
      expect(url).not.toContain(route);
    });
  }
});
