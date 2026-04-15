import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads with phone input', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Bhaktisetu').first()).toBeVisible();
    await expect(page.locator('input[type="tel"]').or(page.locator('input#phone'))).toBeVisible();
    await expect(page.locator('text=Send OTP').first()).toBeVisible();
  });

  test('login page has demo sign-in button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Demo Sign In').first()).toBeVisible();
  });

  test('demo sign-in redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('text=Demo Sign In').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Arjun').first()).toBeVisible();
  });

  test('dashboard shows user info after demo login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('text=Demo Sign In').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Arjun').first()).toBeVisible();
  });

  test('profile page loads after demo login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('text=Demo Sign In').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.goto('/profile');
    const res = await page.goto('/profile');
    expect(res?.status()).toBe(200);
  });
});
