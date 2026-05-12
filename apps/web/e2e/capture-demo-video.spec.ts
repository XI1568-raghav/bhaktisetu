import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Single-session demo capture for KYC reviewers (Razorpay, Stripe,
 * WhatsApp Meta), Reddit organic, and investor outreach. Unlike
 * capture-pitch.spec.ts (which splits into 12 separate MP4s for
 * /pitch deck slides), this is ONE continuous browser session so
 * Playwright produces a single MP4 of natural product use.
 *
 * Output: test-results/<run-id>/.../video.webm — convert to MP4
 * with `scripts/build-demo-video.sh` (uses ffmpeg).
 *
 * Run:
 *   DEMO_BASE_URL=https://darshya.online \
 *   pnpm --filter @poojly/web exec playwright test \
 *     e2e/capture-demo-video.spec.ts --project chromium --headed
 */

const BASE = process.env.DEMO_BASE_URL ?? 'https://darshya.online';
const KEYFRAMES_DIR = path.resolve(__dirname, '..', 'demo-keyframes');

if (!fs.existsSync(KEYFRAMES_DIR)) fs.mkdirSync(KEYFRAMES_DIR, { recursive: true });

test.use({
  baseURL: BASE,
  viewport: { width: 1920, height: 1080 },
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
  screenshot: 'on',
  trace: 'off',
});

test.setTimeout(300_000);

async function pause(page: import('@playwright/test').Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function snap(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(KEYFRAMES_DIR, `${name}.png`),
    fullPage: false,
  });
}

test('darshya demo — golden path single session', async ({ page }) => {
  // Step 1 — Home hero
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '01-home-hero');
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await pause(page, 2500);
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await pause(page, 2500);
  await snap(page, '02-home-features');

  // Step 2 — Browse temples
  await page.goto('/temples', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '03-temples-grid');

  // Step 3 — Open a temple (first available)
  const templeLink = page.locator('a[href^="/temples/"]').first();
  if (await templeLink.count()) {
    await templeLink.click();
    await page.waitForLoadState('domcontentloaded');
    await pause(page, 3000);
    await snap(page, '04-temple-detail');
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
    await pause(page, 2000);
  }

  // Step 4 — Pujas list
  await page.goto('/pujas', { waitUntil: 'domcontentloaded' });
  await pause(page, 2500);
  await snap(page, '05-pujas-grid');

  // Step 5 — Puja detail (booking entry point)
  const pujaLink = page.locator('a[href^="/pujas/"]').first();
  if (await pujaLink.count()) {
    await pujaLink.click();
    await page.waitForLoadState('domcontentloaded');
    await pause(page, 3000);
    await snap(page, '06-puja-detail');
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
    await pause(page, 2500);
    await snap(page, '07-puja-booking-form');
  }

  // Step 6 — Live darshan
  await page.goto('/darshan', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '08-darshan-live');

  // Step 7 — AI Pandit (Asha)
  await page.goto('/astrology', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '09-astrology');
  const chatTrigger = page.locator('button, a').filter({ hasText: /asha|ai|chat|pandit/i }).first();
  if (await chatTrigger.count()) {
    await chatTrigger.click().catch(() => {});
    await pause(page, 2000);
    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.count()) {
      await input.fill('When is the next Ekadashi and what should I do?');
      await pause(page, 1500);
      await snap(page, '10-ai-chat');
    }
  }

  // Step 8 — Gau Seva donations (80G)
  await page.goto('/gaushala', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '11-gaushala-80g');

  // Step 9 — NRI Premium tier (the new landing)
  await page.goto('/nri', { waitUntil: 'domcontentloaded' });
  await pause(page, 3000);
  await snap(page, '12-nri-hero');
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
  await pause(page, 2500);
  await snap(page, '13-nri-comparison');
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
  await pause(page, 2500);
  await snap(page, '14-nri-faq');

  // Step 10 — Upgrade page (shows price tiers)
  await page.goto('/upgrade', { waitUntil: 'domcontentloaded' });
  await pause(page, 3500);
  await snap(page, '15-upgrade-tiers');

  // End — back to home for clean tail
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await pause(page, 2000);
  await snap(page, '16-home-tail');

  expect(true).toBe(true);
});
