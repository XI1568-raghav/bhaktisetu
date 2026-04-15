import { test, expect } from '@playwright/test';

test.describe('Pujas & Booking', () => {
  test('pujas page loads with puja cards', async ({ page }) => {
    await page.goto('/pujas');
    await expect(page.locator('h1')).toBeVisible();
    const prices = page.locator('text=/₹/');
    expect(await prices.count()).toBeGreaterThanOrEqual(3);
  });

  test('puja detail page loads', async ({ page }) => {
    const res = await page.goto('/pujas/rudrabhishek');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('booking wizard returns 200', async ({ page }) => {
    const res = await page.goto('/pujas/rudrabhishek/book');
    expect(res?.status()).toBe(200);
  });

  test('bookings page returns 200', async ({ page }) => {
    const res = await page.goto('/bookings');
    expect(res?.status()).toBe(200);
  });

  test('booking detail returns 200', async ({ page }) => {
    const res = await page.goto('/bookings/demo-001');
    expect(res?.status()).toBe(200);
  });
});
