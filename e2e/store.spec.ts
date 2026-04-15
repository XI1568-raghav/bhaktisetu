import { test, expect } from '@playwright/test';

test.describe('Store', () => {
  test('store page loads with products', async ({ page }) => {
    await page.goto('/store');
    await expect(page.locator('h1')).toBeVisible();
    const prices = page.locator('text=/₹[\\d,]+/');
    expect(await prices.count()).toBeGreaterThanOrEqual(5);
  });

  test('store has product images', async ({ page }) => {
    await page.goto('/store');
    const images = page.locator('img[alt]');
    expect(await images.count()).toBeGreaterThanOrEqual(5);
  });

  test('product detail returns 200', async ({ page }) => {
    const res = await page.goto('/store/premium-brass-puja-thali-set');
    expect(res?.status()).toBe(200);
  });

  test('cart page returns 200', async ({ page }) => {
    const res = await page.goto('/store/cart');
    expect(res?.status()).toBe(200);
  });

  test('checkout page returns 200', async ({ page }) => {
    const res = await page.goto('/store/checkout');
    expect(res?.status()).toBe(200);
  });
});
