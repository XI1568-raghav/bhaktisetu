import { test, expect } from '@playwright/test';

test.describe('Astrology', () => {
  test('astrology hub loads with astrologers', async ({ page }) => {
    await page.goto('/astrology');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=/₹\\d+\\/min/').first()).toBeVisible();
  });

  test('astrologers have online status indicators', async ({ page }) => {
    await page.goto('/astrology');
    await expect(page.locator('text=Chat Now').first()).toBeVisible();
  });

  test('astrologer profile page returns 200', async ({ page }) => {
    const res = await page.goto('/astrology/astro_001');
    expect(res?.status()).toBe(200);
  });

  test('kundli page returns 200', async ({ page }) => {
    const res = await page.goto('/astrology/kundli');
    expect(res?.status()).toBe(200);
  });

  test('horoscope page returns 200', async ({ page }) => {
    const res = await page.goto('/astrology/horoscope');
    expect(res?.status()).toBe(200);
  });
});
