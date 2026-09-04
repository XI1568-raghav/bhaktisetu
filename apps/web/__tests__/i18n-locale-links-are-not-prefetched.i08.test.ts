import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LOCALES } from '../lib/i18n/locales';

/**
 * I-08 — a locale must be CHOSEN, and a prefetch is not a choice.
 *
 * `apps/web/middleware.ts` has an `isPrefetch()` guard whose entire purpose is
 * to stop a speculative fetch from writing `poojly_language`. Three of its four
 * branches work. The fourth is `next-router-prefetch`, which is the header
 * next/link actually sends, and Next strips every FLIGHT_HEADER from the
 * request before middleware runs — so the guard is blind to the only prefetch
 * path this product has.
 *
 * MEASURED AGAINST PRODUCTION, 2026-09-01 (darshya.online, Render standalone,
 * one curl per row — this is not a dev-server artefact):
 *
 *   headers sent with the request                     result
 *   ------------------------------------------------  --------------------------
 *   Sec-Purpose: prefetch          -> GET /            200, no Set-Cookie   ✓
 *   Purpose: prefetch              -> GET /            200, no Set-Cookie   ✓
 *   X-Moz: prefetch                -> GET /            200, no Set-Cookie   ✓
 *   Next-Router-Prefetch: 1        -> GET /            307 -> /hi           ✗
 *   RSC:1 + Next-Router-Prefetch:1 -> GET /hi?_rsc=abc Set-Cookie:
 *                                                      poojly_language=hi,
 *                                                      Max-Age=31536000     ✗
 *   RSC:1 + Next-Router-Prefetch:1 -> GET /?lang=en&_rsc=abc  (with
 *                                     Cookie: poojly_language=hi)
 *                                                      Set-Cookie:
 *                                                      poojly_language=en   ✗
 *
 * The last two rows are the user-visible harm, live: scrolling to the footer of
 * an English page adopted whichever locale was prefetched last for a year, and
 * scrolling to the footer while reading in Hindi erased that choice back to
 * English. Neither involved a click. All six footer links reproduced it —
 * /hi, /ta, /te, /bn, /mr and /?lang=en.
 *
 * middleware.ts's own docblock says that when the header is unavailable the
 * remedy "is at the call site (drop the prefetch …), never in header sniffing".
 * This guard holds the call sites to that. It is deliberately a REPO-WIDE scan
 * rather than a check on the footer block, because the defect is not "these six
 * links" — it is "any <Link> to a locale, anywhere, is a silent locale switch".
 *
 * Source-scanned rather than rendered because these are Links inside a server
 * layout and page bodies, not an isolable component; comments are stripped
 * first so a docblock quoting a locale href cannot satisfy or trip it.
 */

const APP_DIR = path.resolve(__dirname, '../app');
const COMPONENTS_DIR = path.resolve(__dirname, '../components');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...tsxFiles(full));
    } else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Locale roots the middleware treats as a locale-carrying path. */
const LOCALE_ROOTS = new Set(
  SUPPORTED_LOCALES.filter((l) => l !== 'en').map((l) => `/${l}`),
);

/** Every `<Link …>` opening tag in a source file, as raw text. */
function linkTags(src: string): string[] {
  return src.match(/<Link\b[^>]*>/g) ?? [];
}

/** The literal href of a `<Link>` tag, or null when it is an expression. */
function literalHref(tag: string): string | null {
  const m = /\bhref="([^"]*)"/.exec(tag);
  return m ? m[1] : null;
}

/**
 * A link that, when fetched, makes the middleware write `poojly_language`:
 * a locale root, or anything carrying the `lang=` switch parameter.
 */
function switchesLocale(href: string | null): boolean {
  if (!href) return false;
  const [pathPart, query = ''] = href.split('?');
  if (LOCALE_ROOTS.has(pathPart)) return true;
  return /(^|&)lang=/.test(query);
}

interface Offender {
  file: string;
  href: string;
}

function unguardedLocaleLinks(): Offender[] {
  const offenders: Offender[] = [];
  for (const file of [...tsxFiles(APP_DIR), ...tsxFiles(COMPONENTS_DIR)]) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const tag of linkTags(src)) {
      const href = literalHref(tag);
      if (!switchesLocale(href)) continue;
      if (/prefetch=\{false\}/.test(tag)) continue;
      offenders.push({ file: path.relative(path.resolve(__dirname, '..'), file), href: href! });
    }
  }
  return offenders;
}

/** Every locale-switching Link found, guarded or not — the denominator. */
function allLocaleLinks(): Offender[] {
  const found: Offender[] = [];
  for (const file of [...tsxFiles(APP_DIR), ...tsxFiles(COMPONENTS_DIR)]) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const tag of linkTags(src)) {
      const href = literalHref(tag);
      if (switchesLocale(href)) {
        found.push({ file: path.relative(path.resolve(__dirname, '..'), file), href: href! });
      }
    }
  }
  return found;
}

describe('I-08 — no <Link> can switch a reader’s language by being prefetched', () => {
  it('recognises a locale-switching href, and only those', () => {
    // The classifier is the load-bearing part of the scan; if it silently
    // stopped matching, every assertion below would pass on an empty set.
    expect(switchesLocale('/hi')).toBe(true);
    expect(switchesLocale('/mr')).toBe(true);
    expect(switchesLocale('/?lang=en')).toBe(true);
    expect(switchesLocale('/temples?page=2&lang=ta')).toBe(true);
    // Not locale switches: a content category, a deeper locale page (the
    // middleware reads the first segment, but these are not the footer's
    // one-tap switchers and none of them exist as literals today), the root.
    expect(switchesLocale('/temples')).toBe(false);
    expect(switchesLocale('/')).toBe(false);
    expect(switchesLocale(null)).toBe(false);
  });

  it('still finds the locale links at all — the denominator is not zero', () => {
    // The footer alone carries six. If a refactor moves them behind a variable
    // href this drops and the scan stops proving anything; better to fail here
    // than to go quietly green.
    const all = allLocaleLinks();
    expect(all.length).toBeGreaterThanOrEqual(6);
    const hrefs = new Set(all.map((o) => o.href));
    for (const href of ['/hi', '/ta', '/te', '/bn', '/mr', '/?lang=en']) {
      expect(hrefs.has(href), `no <Link href="${href}"> found to guard`).toBe(true);
    }
  });

  it('every one of them opts out of prefetching', () => {
    expect(unguardedLocaleLinks()).toEqual([]);
  });
});
