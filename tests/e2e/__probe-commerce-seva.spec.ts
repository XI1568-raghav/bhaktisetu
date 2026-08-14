import { test, Page } from '@playwright/test';

/** PROBE phase 5: decisive checks + mobile. LIVE prod, READ-ONLY. No submit, no pay, no auth. */

const BASE = 'https://darshya.online';
test.use({ video: 'off', trace: 'off', screenshot: 'off' });
test.describe.configure({ mode: 'serial' });

function attach(page: Page) {
  const err: string[] = [], bad: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') err.push(m.text().replace(/\s+/g, ' ').slice(0, 160)); });
  page.on('pageerror', (e) => err.push('PAGEERROR: ' + String(e).replace(/\s+/g, ' ').slice(0, 160)));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('_rsc=')) bad.push(`${r.status()} ${r.request().resourceType()} ${r.url().slice(0, 120)}`); });
  return { err, bad, reset: () => { err.length = 0; bad.length = 0; } };
}

async function quick(page: Page, path: string, bag: ReturnType<typeof attach>, wait = 3500, bodyN = 400) {
  bag.reset();
  const t0 = Date.now(); let status = -1;
  try { const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); status = r?.status() ?? -1; }
  catch (e) { console.log(`\n### ${path} :: NAVFAIL ${String(e).slice(0, 110)}`); return null; }
  await page.waitForTimeout(wait);
  let i: any = null;
  for (let k = 0; k < 3 && !i; k++) {
    try {
      i = await page.evaluate(() => ({
        url: location.href, title: document.title,
        h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
        nf: /page not found/i.test(document.body.innerText || ''),
        len: (document.body.innerText || '').length,
        body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1600),
        cta: Array.from(document.querySelectorAll('a,button')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
          .map((e) => `${e.tagName === 'A' ? 'A:' : 'B:'}${(e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 38)}${e.getAttribute('href') ? '->' + e.getAttribute('href') : ''}`)
          .filter((s) => s.length > 3).slice(0, 26),
        broken: Array.from(document.querySelectorAll('img')).filter((x) => x.complete && x.naturalWidth === 0).map((x) => (x.getAttribute('src') || '').slice(0, 90)),
        imgs: document.querySelectorAll('img').length,
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      }));
    } catch { await page.waitForTimeout(2000); }
  }
  if (!i) { console.log(`\n### ${path} HTTP=${status} EVAL_FAILED`); return null; }
  console.log(`\n### ${path} -> ${i.url} HTTP=${status} ${Date.now() - t0}ms ${i.nf ? '*** 404-PAGE ***' : ''} ${i.sw > i.cw + 2 ? `*** H-OVERFLOW ${i.sw}>${i.cw} ***` : ''}`);
  console.log(`T:${i.title} | H1:${i.h1} | len=${i.len} imgs=${i.imgs} broken=${i.broken.length}`);
  console.log(`BODY: ${i.body.slice(0, bodyN)}`);
  console.log(`CTA: ${JSON.stringify(i.cta)}`);
  if (i.broken.length) console.log(`BROKEN_IMG: ${JSON.stringify(i.broken.slice(0, 6))}`);
  if (bag.err.length) console.log(`CONSOLE_ERR: ${JSON.stringify(Array.from(new Set(bag.err)).slice(0, 5))}`);
  if (bag.bad.length) console.log(`HTTP_BAD: ${JSON.stringify(Array.from(new Set(bag.bad)).slice(0, 6))}`);
  return i;
}

test('J: DECISIVE — can a buyer actually add to cart?', async ({ page }) => {
  test.setTimeout(420000);
  const bag = attach(page);
  await quick(page, '/store/view?handle=organic-camphor-250g', bag, 7000, 120);
  const rej = page.getByRole('button', { name: /^reject all$/i });
  if (await rej.count()) { await rej.first().click().catch(() => {}); await page.waitForTimeout(800); }

  // What is actually on top of the Add to Cart / Buy Now buttons at their click point?
  const probe = await page.evaluate(() => {
    const out: any[] = [];
    for (const label of ['Add to Cart', 'Buy Now']) {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim().startsWith(label));
      if (!btn) { out.push({ label, found: false }); continue; }
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      out.push({
        label, found: true, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        inViewport: r.top >= 0 && r.bottom <= innerHeight,
        disabled: (btn as HTMLButtonElement).disabled,
        pointerEvents: getComputedStyle(btn).pointerEvents,
        topElementAtCenter: top ? `${top.tagName}.${String((top as HTMLElement).className).slice(0, 60)}` : 'null',
        topIsTheButton: top === btn || btn.contains(top as Node),
      });
    }
    return out;
  });
  console.log(`\n### CLICKABILITY PROBE (elementFromPoint at button centre)\n${JSON.stringify(probe, null, 1)}`);

  // Genuine user-equivalent click: real mouse press at the button centre.
  const box = await page.getByRole('button', { name: /^add to cart$/i }).first().boundingBox();
  console.log(`\n### boundingBox Add to Cart = ${JSON.stringify(box)}`);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => ({
      cart: localStorage.getItem('poojly_cart'),
      url: location.href,
      btnText: Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => /add to cart|added|buy now/i.test(t)),
      header: (document.querySelector('header')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
      cartBtn: Array.from(document.querySelectorAll('button,a')).filter((e) => /cart/i.test(e.getAttribute('aria-label') || '')).map((e) => `${e.tagName} ${e.getAttribute('aria-label')} href=${e.getAttribute('href')}`),
    }));
    console.log(`### AFTER REAL MOUSE CLICK: cart=${String(after.cart).slice(0, 220)}`);
    console.log(`    url=${after.url} btnText=${JSON.stringify(after.btnText)}`);
    console.log(`    header=${after.header}`);
    console.log(`    cartControls=${JSON.stringify(after.cartBtn)}`);

    // Now open the cart via its own control and look for the checkout CTA
    const cartCtl = page.locator('[aria-label*="Cart" i]').first();
    if (await cartCtl.count()) {
      await cartCtl.click().catch(() => {});
      await page.waitForTimeout(2500);
      const drawer = await page.evaluate(() => ({
        text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 900),
        links: Array.from(document.querySelectorAll('a')).map((a) => `${(a.textContent || '').trim().slice(0, 34)}->${a.getAttribute('href')}`).filter((s) => /cart|checkout/i.test(s)),
      }));
      console.log(`### CART DRAWER links=${JSON.stringify(drawer.links)}`);
      console.log(`### CART DRAWER text=${drawer.text.slice(0, 500)}`);
    } else { console.log('### NO element with aria-label containing "Cart" found'); }
  }
  await quick(page, '/store/cart', bag, 4000, 500);
});

test('K: fabricated-profile check + orphan detail pages', async ({ page }) => {
  test.setTimeout(420000);
  const bag = attach(page);
  await quick(page, '/astrology/this-astrologer-does-not-exist-xyz', bag, 6000, 700);
  await quick(page, '/astrology/astro_001/book', bag, 6000, 700);
  await quick(page, '/gaushala/2342e603-5af8-469a-acb3-da18d5a6b40b', bag, 3000, 200);
  await quick(page, '/gaushala/74188f87-de0f-45f4-bc10-34ec4bb9469f', bag, 3000, 200);
  await quick(page, '/wellness/instructors/bf4659b8-5b84-49ca-9dd5-0139ac904f64', bag, 4000, 500);
  await quick(page, '/yatra/char-dham/book', bag, 6000, 900);
});

test('L: mobile 390x844', async ({ browser }) => {
  test.setTimeout(420000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const bag = attach(page);
  for (const p of ['/store', '/store/view?handle=organic-camphor-250g', '/donations?causeId=gs_001&causeKind=gaushala&causeName=Shri%20Krishna%20Gaushala', '/gaushala', '/yatra/char-dham', '/astrology']) {
    const i = await quick(page, p, bag, 4000, 180);
    if (i) {
      const ov = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        return Array.from(document.querySelectorAll('body *')).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > w + 4 && r.left < w; })
          .slice(0, 6).map((el) => `${el.tagName}.${String((el as HTMLElement).className).slice(0, 40)} r=${Math.round(el.getBoundingClientRect().right)}/${w}`);
      });
      const small = await page.evaluate(() => Array.from(document.querySelectorAll('a,button')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32; }).length);
      console.log(`MOBILE_OVERFLOW: ${JSON.stringify(ov)}  |  tap-targets<32px: ${small}`);
    }
  }
  await ctx.close();
});
