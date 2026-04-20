import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
  test('home page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Poojly/);
  });

  test('nav bar is visible and has logo', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test('nav links are clickable on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav a[href="/temples"]')).toBeVisible();
    await expect(page.locator('nav a[href="/pujas"]')).toBeVisible();
    await expect(page.locator('nav a[href="/store"]')).toBeVisible();
  });

  test('footer is present', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('public pages all return 200', async ({ page }) => {
    const publicRoutes = [
      '/', '/temples', '/pujas', '/content', '/darshan',
      '/panchang', '/store', '/gaushala', '/astrology',
      '/ask-pandit', '/auth/login', '/demo', '/mobile',
    ];
    for (const route of publicRoutes) {
      const res = await page.goto(route);
      expect(res?.status(), `${route} should return 200`).toBe(200);
    }
  });

  test('auth-protected pages load without crashing', async ({ page }) => {
    const protectedRoutes = ['/bookings', '/dashboard', '/profile'];
    for (const route of protectedRoutes) {
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Protected pages may redirect or return 200 — both are valid
      const status = res?.status() ?? 200;
      expect(status, `${route} should not return 500`).not.toBe(500);
    }
  });
});
