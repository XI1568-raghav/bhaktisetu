// Render docs/client-pitch-deck.html → docs/client-pitch-deck.pdf via Playwright Chromium.
// 1280x720 per slide, no margins, honors @page CSS.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PW_CORE = resolve('E:/NewClaude/bhaktisetu/node_modules/.pnpm/playwright-core@1.59.1/node_modules/playwright-core/index.mjs');
const CHROME = 'C:/Users/DELL/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const HTML = 'E:/NewClaude/bhaktisetu/docs/client-pitch-deck.html';
const OUT = 'E:/NewClaude/bhaktisetu/docs/client-pitch-deck.pdf';

const { chromium } = await import(pathToFileURL(PW_CORE).href);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle', timeout: 90000 });
  await page.emulateMedia({ media: 'print' });
  // Wait extra for web fonts (Fraunces, Inter, Tiro Devanagari) to settle
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.pdf({
    path: OUT,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: true,
  });
  console.log('OK', OUT);
} finally {
  await browser.close();
}
