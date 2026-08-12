import { test, expect, Page } from '@playwright/test';

/**
 * READ-ONLY production probe: auth pages + portal routes, logged out.
 * NEVER submits a form, never logs in, never pays.
 */

const BASE = 'https://darshya.online';

const AUTH_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/verify',
];

const PORTAL_ROUTES = [
  '/priest',
  '/astrologer-portal',
  '/wellness-portal',
  '/store-admin',
  '/temple-portal',
  '/gaushala-portal',
  '/admin',
  '/payouts',
];

type Probe = {
  url: string;
  finalUrl: string;
  status: number;
  chain: string[];
  title: string;
  loadMs: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  brokenImages: string[];
  overflowPx: number;
  h1: string;
  bodyLen: number;
};

function wire(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const chain: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 300)));
  page.on('requestfailed', (r) => {
    failedRequests.push(`${r.failure()?.errorText ?? 'FAIL'} ${r.method()} ${r.url().slice(0, 160)}`);
  });
  page.on('response', (r) => {
    const req = r.request();
    if (req.resourceType() === 'document' && req.frame() === page.mainFrame()) {
      chain.push(`${r.status()} ${r.url()}`);
    }
    if (r.status() >= 400 && req.resourceType() !== 'document') {
      failedRequests.push(`HTTP${r.status()} ${req.method()} ${r.url().slice(0, 160)}`);
    }
  });
  return { consoleErrors, pageErrors, failedRequests, chain };
}

async function probe(page: Page, path: string): Promise<Probe> {
  const sinks = wire(page);
  const t0 = Date.now();
  let status = 0;
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = resp?.status() ?? 0;
  } catch (e) {
    sinks.pageErrors.push('GOTO_FAILED: ' + String(e).slice(0, 200));
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: 12000 });
  } catch {
    /* fine */
  }
  const loadMs = Date.now() - t0;

  const info = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    const broken = imgs
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src || '(no src)').slice(0, 160));
    return {
      title: document.title,
      h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 120),
      bodyLen: (document.body?.innerText || '').length,
      broken,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });

  return {
    url: path,
    finalUrl: page.url(),
    status,
    chain: sinks.chain,
    title: info.title,
    loadMs,
    consoleErrors: sinks.consoleErrors,
    pageErrors: sinks.pageErrors,
    failedRequests: sinks.failedRequests,
    brokenImages: info.broken,
    overflowPx: Math.max(0, info.scrollW - info.clientW),
    h1: info.h1,
    bodyLen: info.bodyLen,
  };
}

function dump(p: Probe) {
  console.log(`\n=== ${p.url} ===`);
  console.log(`  status=${p.status} finalUrl=${p.finalUrl}`);
  console.log(`  docChain=${JSON.stringify(p.chain)}`);
  console.log(`  title="${p.title}" h1="${p.h1}" bodyLen=${p.bodyLen} loadMs=${p.loadMs} overflowPx=${p.overflowPx}`);
  if (p.brokenImages.length) console.log(`  BROKEN_IMAGES=${JSON.stringify(p.brokenImages)}`);
  if (p.consoleErrors.length) console.log(`  CONSOLE_ERRORS=${JSON.stringify([...new Set(p.consoleErrors)])}`);
  if (p.pageErrors.length) console.log(`  PAGE_ERRORS=${JSON.stringify([...new Set(p.pageErrors)])}`);
  if (p.failedRequests.length) console.log(`  FAILED_REQS=${JSON.stringify([...new Set(p.failedRequests)])}`);
}

async function enumerate(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
    };
    const links = Array.from(document.querySelectorAll('a'))
      .filter(vis)
      .map((a) => ({
        label: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        href: a.getAttribute('href') || '',
        target: a.getAttribute('target') || '',
      }));
    const buttons = Array.from(document.querySelectorAll('button,[role="button"],input[type=submit]'))
      .filter(vis)
      .map((b) => ({
        label: (b.textContent || (b as HTMLInputElement).value || b.getAttribute('aria-label') || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 60),
        type: (b as HTMLButtonElement).type || '',
        disabled: (b as HTMLButtonElement).disabled === true,
      }));
    return { links, buttons };
  });
}

async function fields(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    return Array.from(document.querySelectorAll('input,select,textarea'))
      .filter(vis)
      .map((i) => {
        const el = i as HTMLInputElement;
        return {
          name: el.name || el.id || '(unnamed)',
          type: el.type,
          placeholder: el.placeholder || '',
          required: el.required,
          autocomplete: el.getAttribute('autocomplete') || '',
          minLength: el.minLength,
          pattern: el.getAttribute('pattern') || '',
          inputmode: el.getAttribute('inputmode') || '',
          ariaInvalid: el.getAttribute('aria-invalid') || '',
        };
      });
  });
}

// ---------------------------------------------------------------- AUTH PAGES

test('A1 auth pages: load, console, links, buttons, fields', async ({ page }) => {
  test.setTimeout(240000);
  for (const r of AUTH_ROUTES) {
    const p = await probe(page, r);
    dump(p);
    const { links, buttons } = await enumerate(page);
    console.log(`  LINKS(${links.length})=${JSON.stringify(links)}`);
    console.log(`  BUTTONS(${buttons.length})=${JSON.stringify(buttons)}`);
    console.log(`  FIELDS=${JSON.stringify(await fields(page))}`);
    const fold = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => {
        const rc = b.getBoundingClientRect();
        return rc.width > 0 && rc.height > 0;
      });
      const primary = btns.find((b) => (b as HTMLButtonElement).type === 'submit') || btns[0];
      if (!primary) return null;
      const rc = primary.getBoundingClientRect();
      return {
        label: (primary.textContent || '').trim().replace(/\s+/g, ' '),
        top: Math.round(rc.top),
        aboveFold: rc.top >= 0 && rc.bottom <= window.innerHeight,
        viewportH: window.innerHeight,
      };
    });
    console.log(`  PRIMARY_CTA=${JSON.stringify(fold)}`);
  }
});

test('A2 login page: tabs, password toggle, google button, validation (fill only, NO submit)', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(BASE + '/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

  const tabs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button,[role="tab"]'))
      .map((b) => (b.textContent || '').trim().replace(/\s+/g, ' '))
      .filter((t) => /email|phone|mobile|otp/i.test(t))
  );
  console.log('LOGIN_TABS=', JSON.stringify(tabs));

  const google = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,a')).find((b) =>
      /google/i.test(b.textContent || '')
    );
    if (!el) return null;
    const rc = el.getBoundingClientRect();
    return { tag: el.tagName, label: (el.textContent || '').trim().replace(/\s+/g, ' '), w: Math.round(rc.width), h: Math.round(rc.height) };
  });
  console.log('GOOGLE_BUTTON=', JSON.stringify(google));

  // fill (never submit)
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const pwd = page.locator('input[type="password"], input[name="password"]').first();
  if (await email.count()) {
    await email.fill('not-an-email');
    await email.blur();
    await page.waitForTimeout(600);
    console.log(
      'AFTER_BAD_EMAIL_BLUR errText=',
      JSON.stringify(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('[role="alert"],.text-red-500,.text-red-600,.text-destructive,p.error,span.error'))
            .map((e) => (e.textContent || '').trim())
            .filter(Boolean)
        )
      )
    );
    const validity = await email.evaluate((el: HTMLInputElement) => ({
      valid: el.checkValidity(),
      message: el.validationMessage,
      type: el.type,
      required: el.required,
    }));
    console.log('EMAIL_NATIVE_VALIDITY=', JSON.stringify(validity));
  } else {
    console.log('EMAIL_FIELD: NOT FOUND');
  }

  if (await pwd.count()) {
    await pwd.fill('Sh0rt');
    await pwd.blur();
    await page.waitForTimeout(400);
    const before = await pwd.getAttribute('type');
    // find the toggle inside the password wrapper
    const toggled = await page.evaluate(() => {
      const input = document.querySelector('input[type="password"],input[name="password"]') as HTMLInputElement | null;
      if (!input) return 'no-input';
      const wrap = input.closest('div');
      const btn = wrap?.querySelector('button') as HTMLButtonElement | null;
      if (!btn) return 'no-toggle-button';
      btn.click();
      return 'clicked:' + ((btn.getAttribute('aria-label') || btn.textContent || '').trim() || '(no label)');
    });
    await page.waitForTimeout(300);
    const after = await page
      .locator('input[name="password"], input[type="password"], input[type="text"]')
      .first()
      .getAttribute('type');
    const anyText = await page.evaluate(() => {
      const i = Array.from(document.querySelectorAll('input')).find(
        (x) => (x as HTMLInputElement).value === 'Sh0rt'
      ) as HTMLInputElement | undefined;
      return i ? i.type : 'value-gone';
    });
    console.log(`PASSWORD_TOGGLE before=${before} toggleResult=${toggled} afterFirst=${after} typeOfFieldHoldingValue=${anyText}`);
    const pwdA11y = await page.evaluate(() => {
      const input = Array.from(document.querySelectorAll('input')).find(
        (x) => (x as HTMLInputElement).value === 'Sh0rt'
      ) as HTMLInputElement | undefined;
      const wrap = input?.closest('div');
      const btn = wrap?.querySelector('button');
      return {
        btnAriaLabel: btn?.getAttribute('aria-label') || null,
        btnAriaPressed: btn?.getAttribute('aria-pressed') || null,
        btnType: (btn as HTMLButtonElement | undefined)?.type || null,
        btnText: (btn?.textContent || '').trim() || null,
      };
    });
    console.log('PASSWORD_TOGGLE_A11Y=', JSON.stringify(pwdA11y));
  } else {
    console.log('PASSWORD_FIELD: NOT FOUND');
  }

  // tab switch to phone if it exists
  const phoneTab = page.getByRole('button', { name: /phone|mobile/i }).first();
  if (await phoneTab.count()) {
    await phoneTab.click();
    await page.waitForTimeout(800);
    console.log('AFTER_PHONE_TAB fields=', JSON.stringify(await fields(page)));
    console.log(
      'AFTER_PHONE_TAB buttons=',
      JSON.stringify((await enumerate(page)).buttons)
    );
    const phoneInput = page.locator('input[type="tel"], input[name*="phone" i]').first();
    if (await phoneInput.count()) {
      await phoneInput.fill('12');
      await phoneInput.blur();
      await page.waitForTimeout(500);
      console.log(
        'PHONE_SHORT_VALIDATION=',
        JSON.stringify(
          await page.evaluate(() =>
            Array.from(document.querySelectorAll('[role="alert"],.text-red-500,.text-red-600,.text-destructive'))
              .map((e) => (e.textContent || '').trim())
              .filter(Boolean)
          )
        )
      );
      console.log(
        'PHONE_NATIVE=',
        JSON.stringify(
          await phoneInput.evaluate((el: HTMLInputElement) => ({
            valid: el.checkValidity(),
            message: el.validationMessage,
            maxLength: el.maxLength,
            inputmode: el.getAttribute('inputmode'),
          }))
        )
      );
    }
    // switch back
    const emailTab = page.getByRole('button', { name: /^email$/i }).first();
    if (await emailTab.count()) {
      await emailTab.click();
      await page.waitForTimeout(500);
      const persisted = await page.evaluate(() => {
        const e = document.querySelector('input[type="email"],input[name="email"]') as HTMLInputElement | null;
        return e ? e.value : '(no email field)';
      });
      console.log('TAB_ROUNDTRIP email value persisted=', JSON.stringify(persisted));
    }
  } else {
    console.log('PHONE_TAB: NOT FOUND');
  }

  // is the submit button disabled when empty? (observation only)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  console.log(
    'EMPTY_FORM_SUBMIT_STATE=',
    JSON.stringify(
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(
          (x) => (x as HTMLButtonElement).type === 'submit'
        ) as HTMLButtonElement | undefined;
        const form = document.querySelector('form');
        return {
          submitLabel: (b?.textContent || '').trim() || null,
          submitDisabled: b?.disabled ?? null,
          formNoValidate: form?.noValidate ?? null,
          formCheckValidity: form ? (form as HTMLFormElement).checkValidity() : null,
        };
      })
    )
  );
});

test('A3 signup page: fields, password rules, terms links, role picker (fill only, NO submit)', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto(BASE + '/auth/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  console.log('SIGNUP_FIELDS=', JSON.stringify(await fields(page)));
  const e = await enumerate(page);
  console.log('SIGNUP_LINKS=', JSON.stringify(e.links));
  console.log('SIGNUP_BUTTONS=', JSON.stringify(e.buttons));

  const google = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,a')).find((b) => /google/i.test(b.textContent || ''));
    return el ? { tag: el.tagName, label: (el.textContent || '').trim().replace(/\s+/g, ' ') } : null;
  });
  console.log('SIGNUP_GOOGLE=', JSON.stringify(google));

  // weak password -> is there a strength meter / inline rule?
  const pwd = page.locator('input[type="password"]').first();
  if (await pwd.count()) {
    await pwd.fill('a');
    await page.waitForTimeout(700);
    console.log(
      'WEAK_PWD_FEEDBACK=',
      JSON.stringify(
        await page.evaluate(() => {
          const t = document.body.innerText;
          const hints = t
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => /charact|strong|weak|least|uppercase|number|symbol|match/i.test(s))
            .slice(0, 12);
          return hints;
        })
      )
    );
    const nat = await pwd.evaluate((el: HTMLInputElement) => ({
      valid: el.checkValidity(),
      message: el.validationMessage,
      minLength: el.minLength,
    }));
    console.log('SIGNUP_PWD_NATIVE=', JSON.stringify(nat));
  }
  const email = page.locator('input[type="email"], input[name="email"]').first();
  if (await email.count()) {
    await email.fill('bad@@example');
    await email.blur();
    await page.waitForTimeout(600);
    console.log(
      'SIGNUP_BAD_EMAIL_MSGS=',
      JSON.stringify(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('[role="alert"],.text-red-500,.text-red-600,.text-destructive'))
            .map((x) => (x.textContent || '').trim())
            .filter(Boolean)
        )
      )
    );
  }
  // confirm-password mismatch
  const pwds = page.locator('input[type="password"]');
  if ((await pwds.count()) > 1) {
    await pwds.nth(0).fill('Abcdef123!');
    await pwds.nth(1).fill('Different1!');
    await pwds.nth(1).blur();
    await page.waitForTimeout(700);
    console.log(
      'MISMATCH_MSGS=',
      JSON.stringify(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('[role="alert"],.text-red-500,.text-red-600,.text-destructive'))
            .map((x) => (x.textContent || '').trim())
            .filter(Boolean)
        )
      )
    );
  } else {
    console.log('CONFIRM_PASSWORD_FIELD: only ' + (await pwds.count()) + ' password field(s)');
  }
  // terms checkbox / links
  console.log(
    'TERMS=',
    JSON.stringify(
      await page.evaluate(() => {
        const cb = Array.from(document.querySelectorAll('input[type=checkbox]')).map((c) => ({
          name: (c as HTMLInputElement).name || (c as HTMLInputElement).id,
          required: (c as HTMLInputElement).required,
          label: (c.closest('label')?.textContent || c.parentElement?.textContent || '').trim().slice(0, 120),
        }));
        const legal = Array.from(document.querySelectorAll('a'))
          .filter((a) => /terms|privacy|refund|policy/i.test(a.textContent || ''))
          .map((a) => ({ label: (a.textContent || '').trim(), href: a.getAttribute('href') }));
        return { checkboxes: cb, legalLinks: legal };
      })
    )
  );
});

test('A4 forgot-password + verify pages detail (fill only, NO submit)', async ({ page }) => {
  test.setTimeout(180000);
  for (const r of ['/auth/forgot-password', '/auth/verify']) {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    console.log(`\n--- ${r} ---`);
    console.log('  url=', page.url());
    console.log('  bodyText=', JSON.stringify((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 900)));
    console.log('  fields=', JSON.stringify(await fields(page)));
    const en = await enumerate(page);
    console.log('  links=', JSON.stringify(en.links));
    console.log('  buttons=', JSON.stringify(en.buttons));
  }
  // /auth/verify without a token — what does a cold visitor see?
  await page.goto(BASE + '/auth/verify', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log(
    'VERIFY_NO_TOKEN_AFTER_3S url=',
    page.url(),
    ' text=',
    JSON.stringify((await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 500))
  );
});

test('A5 auth page internal CTAs: follow every internal href', async ({ page }) => {
  test.setTimeout(300000);
  const seen = new Set<string>();
  const results: any[] = [];
  for (const r of AUTH_ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const { links } = await enumerate(page);
    for (const l of links) {
      if (!l.href || l.href.startsWith('#') || l.href.startsWith('mailto') || l.href.startsWith('tel')) continue;
      const abs = l.href.startsWith('http') ? l.href : BASE + (l.href.startsWith('/') ? l.href : '/' + l.href);
      if (!abs.startsWith(BASE)) {
        results.push({ from: r, label: l.label, href: l.href, note: 'EXTERNAL - not followed' });
        continue;
      }
      if (seen.has(abs)) continue;
      seen.add(abs);
      let st = 0;
      let fin = '';
      let bodyLen = 0;
      let h1 = '';
      try {
        const resp = await page.goto(abs, { waitUntil: 'domcontentloaded', timeout: 30000 });
        st = resp?.status() ?? 0;
        fin = page.url();
        const inf = await page.evaluate(() => ({
          len: (document.body?.innerText || '').length,
          h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 80),
          txt: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
        }));
        bodyLen = inf.len;
        h1 = inf.h1 + ' | ' + inf.txt;
      } catch (e) {
        h1 = 'NAV_ERROR ' + String(e).slice(0, 120);
      }
      results.push({ from: r, label: l.label, href: l.href, status: st, landed: fin, bodyLen, h1 });
    }
  }
  console.log('AUTH_CTA_RESULTS=' + JSON.stringify(results, null, 1));
});

// ------------------------------------------------------------ PORTAL ROUTES

test('P1 portals logged out: redirect behaviour, flash of gated content, data leak', async ({ page, context }) => {
  test.setTimeout(300000);
  await context.clearCookies();
  for (const r of PORTAL_ROUTES) {
    const sinks = wire(page);
    const t0 = Date.now();
    let status = 0;
    try {
      const resp = await page.goto(BASE + r, { waitUntil: 'commit', timeout: 40000 });
      status = resp?.status() ?? 0;
    } catch (e) {
      console.log(`${r} GOTO_ERR ${String(e).slice(0, 120)}`);
    }
    // sample the DOM aggressively to catch a flash of gated content
    const samples: { t: number; url: string; text: string }[] = [];
    for (let i = 0; i < 24; i++) {
      const s = await page
        .evaluate(() => ({ url: location.pathname + location.search, text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 220) }))
        .catch(() => null);
      if (s) samples.push({ t: Date.now() - t0, ...s });
      await page.waitForTimeout(120);
    }
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const settleMs = Date.now() - t0;

    const distinct: { t: number; url: string; text: string }[] = [];
    for (const s of samples) {
      const last = distinct[distinct.length - 1];
      if (!last || last.text !== s.text || last.url !== s.url) distinct.push(s);
    }

    const final = await page.evaluate(() => ({
      url: location.pathname + location.search,
      title: document.title,
      h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 120),
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
      len: (document.body?.innerText || '').length,
    }));

    const GATED = /(₹|earnings|payout|total revenue|dashboard|bookings|orders|withdraw|balance|pending|commission|approve|reject)/i;
    const flashed = distinct.filter((d) => GATED.test(d.text) && d.url.startsWith(r));

    // scan the served HTML + next data for leaked PII / business data
    const leak = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const emails = Array.from(new Set((html.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) || []))).slice(0, 12);
      const phones = Array.from(new Set((html.match(/\+?91[- ]?\d{10}|\b[6-9]\d{9}\b/g) || []))).slice(0, 12);
      const rupees = Array.from(new Set((html.match(/(?:₹|Rs\.?\s?)\s?[\d,]{3,}/g) || []))).slice(0, 12);
      return { htmlLen: html.length, emails, phones, rupees };
    });

    console.log(`\n=== PORTAL ${r} ===`);
    console.log(`  httpStatus=${status} docChain=${JSON.stringify(sinks.chain)}`);
    console.log(`  finalUrl=${page.url()} settleMs=${settleMs}`);
    console.log(`  final=${JSON.stringify(final)}`);
    console.log(`  DOM_TRANSITIONS(${distinct.length})=${JSON.stringify(distinct.slice(0, 8))}`);
    console.log(`  GATED_FLASH=${flashed.length ? JSON.stringify(flashed.slice(0, 4)) : 'none'}`);
    console.log(`  LEAK_SCAN=${JSON.stringify(leak)}`);
    if (sinks.consoleErrors.length) console.log(`  CONSOLE_ERRORS=${JSON.stringify([...new Set(sinks.consoleErrors)].slice(0, 8))}`);
    if (sinks.pageErrors.length) console.log(`  PAGE_ERRORS=${JSON.stringify([...new Set(sinks.pageErrors)].slice(0, 8))}`);
    if (sinks.failedRequests.length) console.log(`  FAILED_REQS=${JSON.stringify([...new Set(sinks.failedRequests)].slice(0, 12))}`);
    page.removeAllListeners();
  }
});

test('P2 portals: raw HTTP status + headers (no JS)', async ({ request }) => {
  test.setTimeout(180000);
  for (const r of [...PORTAL_ROUTES, ...AUTH_ROUTES]) {
    const resp = await request.get(BASE + r, { maxRedirects: 0, failOnStatusCode: false });
    const h = resp.headers();
    console.log(
      `RAW ${r} -> ${resp.status()} loc=${h['location'] || '-'} cc=${h['cache-control'] || '-'} cf=${h['cf-cache-status'] || '-'} xrobots=${h['x-robots-tag'] || '-'} ct=${(h['content-type'] || '').split(';')[0]}`
    );
    if (resp.status() === 200) {
      const body = await resp.text();
      const marks = {
        len: body.length,
        hasLoginWord: /sign in|log ?in/i.test(body),
        hasRupee: /₹/.test(body),
        emails: Array.from(new Set(body.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) || [])).slice(0, 8),
        titles: (body.match(/<title>([^<]*)<\/title>/) || [])[1] || '',
      };
      console.log(`     BODY ${JSON.stringify(marks)}`);
    }
  }
});
