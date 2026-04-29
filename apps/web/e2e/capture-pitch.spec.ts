import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Pitch capture suite. NOT a regression test — runs against the live
 * site (https://darshya.online by default) and writes MP4 + PNG
 * keyframes into ../pitch-captures/. Used to assemble the investor
 * walkthrough video and the /pitch interactive deck.
 *
 * Run:
 *   PITCH_BASE_URL=https://darshya.online \
 *   pnpm exec playwright test e2e/capture-pitch.spec.ts \
 *     --project chromium --headed
 */

const BASE = process.env.PITCH_BASE_URL ?? 'https://darshya.online';
const OUT_DIR = path.resolve(__dirname, '..', 'pitch-captures');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

test.use({
  baseURL: BASE,
  viewport: { width: 1920, height: 1080 },
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
  screenshot: 'on',
  trace: 'off',
});

test.setTimeout(120_000);

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage: false,
  });
}

test.describe('pitch capture — golden flows', () => {
  test('01-home-hero', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await snap(page, '01-home-hero');
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
    await snap(page, '01-home-scroll');
  });

  test('02-temples-list', async ({ page }) => {
    await page.goto('/temples', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '02-temples-grid');
  });

  test('03-temple-slug-jsonld', async ({ page }) => {
    await page.goto('/temples', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const firstLink = page.locator('a[href^="/temples/"]').first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await snap(page, '03-temple-detail');
    }
  });

  test('04-pujas-list', async ({ page }) => {
    await page.goto('/pujas', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '04-pujas-grid');
  });

  test('05-puja-booking-start', async ({ page }) => {
    await page.goto('/pujas', { waitUntil: 'domcontentloaded' });
    const firstPuja = page.locator('a[href^="/pujas/"]').first();
    if (await firstPuja.count()) {
      await firstPuja.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await snap(page, '05-puja-detail');
    }
  });

  test('06-darshan-live', async ({ page }) => {
    await page.goto('/darshan', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await snap(page, '06-darshan');
  });

  test('07-panchang', async ({ page }) => {
    await page.goto('/panchang', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await snap(page, '07-panchang');
  });

  test('08-astrology', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '08-astrology');
  });

  test('09-gaushala', async ({ page }) => {
    await page.goto('/gaushala', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '09-gaushala');
  });

  test('10-store', async ({ page }) => {
    await page.goto('/store', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '10-store');
  });

  test('11-yatra', async ({ page }) => {
    await page.goto('/yatra', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await snap(page, '11-yatra');
  });

  test('12-ai-chat', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const chatButtons = page.locator('button, a').filter({ hasText: /asha|chat|ai/i });
    if (await chatButtons.count()) {
      await chatButtons.first().click();
      await page.waitForTimeout(1500);
      const input = page.locator('textarea, input[type="text"]').first();
      if (await input.count()) {
        await input.fill('When is the next Ekadashi?');
        await page.waitForTimeout(800);
        await snap(page, '12-ai-chat-input');
      }
    }
  });
});
