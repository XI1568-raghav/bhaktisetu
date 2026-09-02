// Render brand OG card → apps/web/public/og/default.png via Playwright Chromium.
// 1200x630 saffron→amber gradient + ॐ + wordmark + 4 feature pills + darshya.online.
// Run: node scripts/build-og-default.mjs
//
// TC-01 (P0, trust) — the fourth feature pill used to read "80G Receipts".
//
// Every 80G walker written for this finding had a denominator that
// structurally could not see this file or the artefact it produces:
//
//   apps/web/__tests__/tc01-80g-repo-wide-gate.test.tsx  walks apps/web only,
//                                                        EXTS = .ts .tsx .json
//   apps/api/src/lib/api-80g-repo-wide-gate.tc01.test.ts walks apps/api only
//   apps/mobile/lib/__tests__/eighty-g-*.test.ts          walks apps/mobile only
//
// This generator lives at the repo root and is `.mjs`; its output is a `.png`
// under apps/web/public. Neither is reachable from any of the three walks.
//
// It is also, by reach, the largest single copy of the claim in the product:
// `/og/default.png` is the `og:image` on ~647 route files, so it is the card
// Google, X, WhatsApp, LinkedIn and Slack render for the whole site. Measured
// on production the day this was fixed:
//
//   $ curl -s -o prod.png -w '%{http_code} %{size_download}\n' \
//       https://darshya.online/og/default.png
//   200 62645
//   $ md5sum prod.png apps/web/public/og/default.png
//   5aa9a58985cd948b8c3b4480192bbd2c  prod.png
//   5aa9a58985cd948b8c3b4480192bbd2c  apps/web/public/og/default.png
//
// — byte-identical, so the committed raster IS the live one, and it carried a
// pill reading "80G Receipts".
//
// Why the claim is false, in code rather than in policy:
//   - `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is `false`,
//     with `pan` and `eightyGNumber` both `null`.
//   - `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires BOTH a donee
//     80G registration number AND a donee PAN; without both the PDF prints
//     "Proof of donation — not a tax exemption certificate".
//   - Those come from `gaushala_profiles.regn_80g` / `.pan`, SELECTed in one
//     place (`apps/api/src/routes/donations.ts`) and written by no route in the
//     repository, so `is80GEligible()` is false for every donation, always.
//
// This is a GATE, not a deletion: the flag is read out of company.ts at build
// time rather than mirrored, so the pill cannot drift from the owner's setting.
// Flip `HAS_80G_VERIFIED` to true, re-run this script, and the pill returns.
//
// A raster cannot be grepped, so the two failure modes a text-only guard would
// miss — source fixed but PNG never re-rendered, or PNG replaced by hand — are
// closed by the sidecar manifest written beside this file
// (`scripts/og-default.build.json`): it records the pills that were rendered
// and the SHA-256 of the bytes they produced.
// `apps/web/__tests__/tc01-og-card-80g.test.ts` re-hashes the shipped PNG and
// fails if it is not the file these pills produced.
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const PW_CORE =
  process.env.PLAYWRIGHT_CORE_ENTRY ??
  resolve(
    REPO_ROOT,
    'node_modules/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.mjs',
  );
const CHROME =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  'C:/Users/DELL/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const OUT = resolve(REPO_ROOT, 'apps/web/public/og/default.png');
const MANIFEST = resolve(HERE, 'og-default.build.json');

/**
 * The owner-facing source of truth. Read, never mirrored: a mirrored copy is
 * how this claim survived four waves in five different files.
 */
const COMPANY_TS = resolve(REPO_ROOT, 'apps/web/lib/company.ts');
const companySrc = readFileSync(COMPANY_TS, 'utf8');
const flag = /HAS_80G_VERIFIED:\s*(true|false)/.exec(companySrc)?.[1];
if (flag !== 'true' && flag !== 'false') {
  throw new Error(
    `HAS_80G_VERIFIED not found in ${COMPANY_TS} — refusing to render an OG card whose ` +
      'tax claim cannot be checked against the owner flag.',
  );
}
export const HAS_80G = flag === 'true';

/**
 * The fourth pill. "Numbered Receipts" is the same fallback
 * `apps/remotion-pitch/src/claims.ts` RECEIPT_FEATURE uses, so the share card
 * and the pitch reel cannot describe the same artefact two different ways.
 */
const RECEIPT_PILL = HAS_80G ? '80G Receipts' : 'Numbered Receipts';

const PILLS = ['Live Darshan', 'Puja Booking', 'Vedic Astrology', RECEIPT_PILL];

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,800&family=Inter:wght@500;700&family=Tiro+Devanagari+Sanskrit&display=swap');
  body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  .card { width: 1200px; height: 630px; background: linear-gradient(135deg, #E16318 0%, #F99A48 50%, #FFC107 100%); position: relative; overflow: hidden; padding: 64px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
  .om { position: absolute; right: -60px; top: 50%; transform: translateY(-50%); font-family: 'Tiro Devanagari Sanskrit', serif; font-size: 520px; color: rgba(255,255,255,0.18); line-height: 1; }
  .top { display: flex; align-items: center; gap: 20px; z-index: 2; }
  .wordmark { font-family: 'Fraunces', serif; font-size: 96px; font-weight: 800; color: white; letter-spacing: -2px; line-height: 1; }
  .tagline { color: rgba(255,255,255,0.95); font-size: 32px; font-weight: 500; line-height: 1.3; margin-top: 36px; max-width: 780px; z-index: 2; }
  .pills { display: flex; gap: 12px; flex-wrap: wrap; z-index: 2; }
  .pill { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: white; font-size: 20px; font-weight: 600; padding: 12px 22px; border-radius: 999px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; z-index: 2; }
  .url { font-size: 28px; color: rgba(255,255,255,0.9); font-weight: 700; letter-spacing: 0.5px; }
  .badge { background: white; color: #9E3F0A; font-size: 22px; font-weight: 700; padding: 14px 24px; border-radius: 12px; }
</style></head>
<body>
  <div class="card">
    <span class="om">ॐ</span>
    <div>
      <div class="top">
        <div class="wordmark">Darshya</div>
      </div>
      <div class="tagline">Live darshan. Authentic pujas with video proof. Vedic wisdom guided by AI, rooted in scripture.</div>
    </div>
    <div class="pills">
      ${PILLS.map((p) => `<span class="pill">${p}</span>`).join('\n      ')}
    </div>
    <div class="footer">
      <div class="url">darshya.online</div>
      <div class="badge">India devotional super-app</div>
    </div>
  </div>
</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });

const { chromium } = await import(pathToFileURL(PW_CORE).href);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(HTML, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const raw = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 }, omitBackground: false });
  // PERF-05 quantised the shipped card from 261 KB to 63 KB and pinned it at
  // <= 100 KB in apps/web/__tests__/og-image-assets.perf05.test.ts. Chromium's
  // own screenshot is a 24-bit PNG at ~261 KB, so re-rendering without this
  // step would silently undo that lane's work. A flat gradient + type card
  // quantises to 256 colours with no visible loss and stays a PNG, which the
  // same test requires because ~100 route files hard-code the .png path.
  const { default: sharp } = await import('sharp');
  const buf = await sharp(raw)
    .png({ palette: true, colours: 256, effort: 10, compressionLevel: 9 })
    .toBuffer();
  if (buf.length > 100 * 1024) {
    throw new Error(
      `og/default.png quantised to ${buf.length} B, over the 100 KB budget PERF-05 pinned.`,
    );
  }
  writeFileSync(OUT, buf);
  writeFileSync(
    MANIFEST,
    `${JSON.stringify(
      {
        _comment:
          'TC-01 — written by scripts/build-og-default.mjs. Records the pills baked into ' +
          'apps/web/public/og/default.png, which no text search can read. ' +
          'apps/web/__tests__/tc01-og-card-80g.test.ts re-hashes the shipped PNG against ' +
          'sha256 below, so a source-only fix that never re-rendered the raster fails.',
        has80G: HAS_80G,
        pills: PILLS,
        output: 'apps/web/public/og/default.png',
        bytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
      },
      null,
      2,
    )}\n`,
  );
  console.log('OK', OUT, buf.length, 'bytes', '| pills:', PILLS.join(' · '));
} finally {
  await browser.close();
}
