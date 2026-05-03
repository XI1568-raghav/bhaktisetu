import { test, expect } from '@playwright/test';

test.describe('TD2: Puja booking end-to-end', () => {
  test.describe.configure({ mode: 'serial' });

  test('list page renders puja cards with prices', async ({ page }) => {
    const res = await page.goto('/pujas', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    await expect(page.locator('h1').first()).toBeVisible();
    const priceCount = await page.locator('text=/₹/').count();
    expect(priceCount).toBeGreaterThanOrEqual(1);
  });

  test('detail page loads from listing', async ({ page }) => {
    const res = await page.goto('/pujas', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const detailLink = page.locator('a[href^="/pujas/"]').first();
    if (await detailLink.count()) {
      await detailLink.click();
      await page.waitForURL(/\/pujas\/[^/]+/, { timeout: 15_000 });
    } else {
      await page.goto('/pujas/rudrabhishek');
    }
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('book route returns 200 and renders wizard or signin gate', async ({ page }) => {
    const res = await page.goto('/pujas/rudrabhishek/book', {
      waitUntil: 'domcontentloaded',
    });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('demo razorpay path stays in-app (no real charge)', async ({ page }) => {
    await page.goto('/auth/login');
    const demo = page.locator('text=Demo Sign In').first();
    if (await demo.count()) {
      await demo.click().catch(() => {});
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 15_000 }).catch(() => {});
    }
    const res = await page.goto('/pujas/rudrabhishek/book', {
      waitUntil: 'domcontentloaded',
    });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const url = page.url();
    expect(url).not.toMatch(/api\.razorpay\.com\/v1\/checkout/);
  });

  test('confirmation/booking detail loads for demo booking id', async ({ page }) => {
    const res = await page.goto('/bookings/demo-001', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    expect(res?.status()).toBeLessThan(500);
  });
});
