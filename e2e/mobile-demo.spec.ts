import { test, expect } from '@playwright/test';

test.describe('Mobile Preview & Demo', () => {
  test('mobile home screen loads', async ({ page }) => {
    const res = await page.goto('/mobile');
    expect(res?.status()).toBe(200);
  });

  test('mobile temples screen loads', async ({ page }) => {
    const res = await page.goto('/mobile/temples');
    expect(res?.status()).toBe(200);
  });

  test('mobile darshan screen loads', async ({ page }) => {
    const res = await page.goto('/mobile/darshan');
    expect(res?.status()).toBe(200);
  });

  test('mobile content screen loads', async ({ page }) => {
    const res = await page.goto('/mobile/content');
    expect(res?.status()).toBe(200);
  });

  test('mobile profile screen loads', async ({ page }) => {
    const res = await page.goto('/mobile/profile');
    expect(res?.status()).toBe(200);
  });

  test('iOS + Android demo page loads', async ({ page }) => {
    const res = await page.goto('/demo');
    expect(res?.status()).toBe(200);
  });
});
