import { test, expect } from '@playwright/test';

test.describe('Priest Portal', () => {
  test('priest dashboard returns 200', async ({ page }) => {
    const res = await page.goto('/priest');
    expect(res?.status()).toBe(200);
  });

  test('priest bookings returns 200', async ({ page }) => {
    const res = await page.goto('/priest/bookings');
    expect(res?.status()).toBe(200);
  });

  test('priest payouts returns 200', async ({ page }) => {
    const res = await page.goto('/priest/payouts');
    expect(res?.status()).toBe(200);
  });

  test('priest profile returns 200', async ({ page }) => {
    const res = await page.goto('/priest/profile');
    expect(res?.status()).toBe(200);
  });
});
