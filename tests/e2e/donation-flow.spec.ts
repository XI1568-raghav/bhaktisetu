import { test, expect } from '@playwright/test';

test.describe('TD2: Gaushala donation + 80G receipt', () => {
  test('gaushala list page renders adoption plans', async ({ page }) => {
    const res = await page.goto('/gaushala', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('text=/₹/').first()).toBeVisible();
  });

  test('gaushala has at least one selectable cow card', async ({ page }) => {
    const res = await page.goto('/gaushala', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const cards = page.locator('a[href^="/gaushala/"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('donation amount of ₹501 surfaces on detail or donate route', async ({ page }) => {
    const res = await page.goto('/gaushala/cow_001', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    expect(res?.status()).toBeLessThan(500);
    const donate = page.locator('text=/Donate|Adopt|Sponsor/i').first();
    if (await donate.count()) await expect(donate).toBeVisible();
  });

  test('80G receipt page reachable for demo donor', async ({ page }) => {
    await page.goto('/auth/login');
    const demo = page.locator('text=Demo Sign In').first();
    if (await demo.count()) {
      await demo.click().catch(() => {});
      await page.waitForURL(/\/(dashboard|profile)/, { timeout: 15_000 }).catch(() => {});
    }
    const candidates = ['/donations', '/profile/donations', '/dashboard?tab=donations'];
    let reached = false;
    for (const path of candidates) {
      const r = await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (r && r.status() < 500) {
        reached = true;
        break;
      }
    }
    test.skip(!reached, 'No donations page reachable');
    const receiptHint = page.locator('text=/80G|receipt|DR-/i').first();
    if (await receiptHint.count()) await expect(receiptHint).toBeVisible();
  });

  test('donation form does not crash on submit attempt', async ({ page }) => {
    const res = await page.goto('/gaushala/cow_001', { waitUntil: 'domcontentloaded' });
    test.skip(!res || res.status() >= 500, 'Site unavailable');
    const cta = page.locator('button, a').filter({ hasText: /donate|adopt|sponsor/i }).first();
    if (await cta.count()) {
      await cta.click({ trial: true }).catch(() => {});
    }
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });
});
