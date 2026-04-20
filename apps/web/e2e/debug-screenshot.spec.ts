import { test } from '@playwright/test';

test('capture home page', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'debug-home.png', fullPage: true });
});
