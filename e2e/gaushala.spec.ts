import { test, expect } from '@playwright/test';

test.describe('Gaushala / Cow Adoption', () => {
  test('gaushala page loads with gaushalas', async ({ page }) => {
    await page.goto('/gaushala');
    await expect(page.locator('h1')).toBeVisible();
    // Gaushala cards
    await expect(page.locator('text=Vrindavan').first()).toBeVisible();
  });

  test('gaushala has adoption plans', async ({ page }) => {
    await page.goto('/gaushala');
    await expect(page.locator('text=/₹51/').first()).toBeVisible();
    await expect(page.locator('text=/₹3,000/').first()).toBeVisible();
  });

  test('gaushala has cow images', async ({ page }) => {
    await page.goto('/gaushala');
    const images = page.locator('img[alt]');
    expect(await images.count()).toBeGreaterThanOrEqual(3);
  });

  test('cow detail page loads', async ({ page }) => {
    await page.goto('/gaushala/cow_001');
    const res = await page.goto('/gaushala/cow_001');
    expect(res?.status()).toBe(200);
  });
});
