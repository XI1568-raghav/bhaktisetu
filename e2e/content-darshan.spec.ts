import { test, expect } from '@playwright/test';

test.describe('Content Hub', () => {
  test('content page loads with tabs', async ({ page }) => {
    await page.goto('/content');
    await expect(page.locator('text=Aarti').first()).toBeVisible();
    await expect(page.locator('text=Chalisa').first()).toBeVisible();
  });

  test('content detail returns 200', async ({ page }) => {
    const res = await page.goto('/content/hanuman-chalisa');
    expect(res?.status()).toBe(200);
  });
});

test.describe('Live Darshan', () => {
  test('darshan page loads with streams', async ({ page }) => {
    await page.goto('/darshan');
    await expect(page.locator('h1')).toContainText('Darshan');
    await expect(page.locator('text=LIVE').first()).toBeVisible();
  });

  test('darshan has stream cards', async ({ page }) => {
    await page.goto('/darshan');
    const cards = page.locator('[class*="rounded"]').filter({ hasText: /Varanasi|Tirumala|Mumbai/ });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('darshan detail returns 200', async ({ page }) => {
    const res = await page.goto('/darshan/live-1');
    expect(res?.status()).toBe(200);
  });
});

test.describe('Panchang', () => {
  test('panchang page loads with daily data', async ({ page }) => {
    await page.goto('/panchang');
    await expect(page.locator('text=Tithi').first()).toBeVisible();
  });
});
