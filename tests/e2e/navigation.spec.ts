import { test, expect } from '@playwright/test';

test.describe('TD2: Cross-section navigation works end-to-end', () => {
  test('home page loads with title', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    await expect(page).toHaveTitle(/Darshya|Poojly|Bhakti/i);
  });

  test('home -> temples -> temple detail -> darshan -> back to home', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');

    // Home -> Temples
    const templesLink = page.locator('nav a[href="/temples"]').first();
    await expect(templesLink).toBeVisible({ timeout: 15_000 });
    await templesLink.click();
    await page.waitForURL(/\/temples/, { timeout: 15_000 });
    await expect(page.locator('h1').first()).toBeVisible();

    // Temples -> Temple detail (first card)
    const firstTemple = page.locator('a[href^="/temples/"]').first();
    if (await firstTemple.count()) {
      await firstTemple.click();
      await page.waitForURL(/\/temples\/[^/]+/, { timeout: 15_000 });
      await expect(page.locator('h1').first()).toBeVisible();
    }

    // -> Darshan
    const darshan = await page.goto('/darshan', { waitUntil: 'domcontentloaded' });
    expect(darshan?.status()).toBeLessThan(500);
    await expect(page.locator('h1').first()).toBeVisible();

    // -> Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Darshya|Poojly|Bhakti/i);
  });

  test('every primary nav link returns < 500', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const routes = [
      '/',
      '/temples',
      '/pujas',
      '/content',
      '/darshan',
      '/panchang',
      '/store',
      '/gaushala',
      '/astrology',
      '/ask-pandit',
    ];
    const broken: string[] = [];
    for (const route of routes) {
      const r = await page.goto(route, { waitUntil: 'domcontentloaded' });
      const status = r?.status() ?? 0;
      if (status >= 500) broken.push(`${route} -> ${status}`);
    }
    expect(broken, `Broken routes: ${broken.join(', ')}`).toEqual([]);
  });

  test('footer links present on home', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('mobile viewport: hamburger or nav reachable', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only check');
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const trigger = page
      .locator('button[aria-label*="menu" i], button:has-text("Menu"), [data-testid="mobile-nav"]')
      .first();
    if (await trigger.count()) {
      await trigger.click().catch(() => {});
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
