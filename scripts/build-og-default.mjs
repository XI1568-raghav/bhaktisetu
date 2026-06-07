// Render brand OG card → apps/web/public/og/default.png via Playwright Chromium.
// 1200x630 saffron→amber gradient + ॐ + wordmark + 4 feature pills + darshya.online.
// Run: node scripts/build-og-default.mjs
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const PW_CORE = resolve('E:/NewClaude/bhaktisetu/node_modules/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.mjs');
const CHROME = 'C:/Users/DELL/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const OUT = 'E:/NewClaude/bhaktisetu/apps/web/public/og/default.png';

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
      <span class="pill">Live Darshan</span>
      <span class="pill">Puja Booking</span>
      <span class="pill">Vedic Astrology</span>
      <span class="pill">80G Receipts</span>
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
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 }, omitBackground: false });
  writeFileSync(OUT, buf);
  console.log('OK', OUT, buf.length, 'bytes');
} finally {
  await browser.close();
}
