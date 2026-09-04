/**
 * I-03 / I18N-05 — /content actually RENDERS the Hindi that was already
 * written, for a visitor whose stored locale is `hi`.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM __tests__/i18n-hi-catalog.test.ts.
 * That suite asserts `hi.json.content.views === 'दृश्य'` and that
 * `t('content','hi')` resolves it. Both were true while /content shipped the
 * word "Views" hardcoded in JSX, because nothing on the page ever called the
 * translator: 33 tests were green against a page that rendered three Hindi
 * strings out of twenty-one. Copy reaching a JSON file is not copy reaching a
 * devotee.
 *
 * So every assertion below is made against the HTML the page actually emits,
 * with the locale cookie set the way the middleware would set it. If the page
 * regresses to hardcoded English, or the server body stops reading the cookie,
 * or the tabs stop going through the catalogue, these fail — none of which the
 * catalogue suite can detect.
 *
 * The count assertion at the bottom is the anti-regression half. Asserting a
 * handful of named strings would still pass if the page fell back to the three
 * labels ContentPageHeader used to read on its own, so the number of DISTINCT
 * Devanagari strings is pinned too.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToReadableStream } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import type React from 'react';

import { LOCALE_COOKIE } from '../../lib/i18n/locales';

/** The locale the mocked request carries. Mutated per render. */
const request = { locale: 'en' };

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'poojly_language' ? { value: request.locale } : undefined,
  }),
}));

// ContentPageHeader calls router.refresh() so a language pick re-runs the
// SERVER render against the cookie it just wrote. There is no app-router
// context in a bare SSR render, so stub it.
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  };
});

type ContentPageProps = {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>;
};

async function renderContent(
  locale: string,
  params: { type?: string; search?: string; page?: string } = {},
): Promise<string> {
  request.locale = locale;
  const mod = await import('../../app/content/page');
  const Page = mod.default as unknown as (
    p: ContentPageProps,
  ) => Promise<React.ReactElement>;
  const element = await Page({ searchParams: Promise.resolve(params) });
  const stream = await renderToReadableStream(element);
  await (stream as unknown as { allReady: Promise<void> }).allReady;
  return await new Response(stream as unknown as ReadableStream).text();
}

/** Every distinct Devanagari run in the emitted HTML, attributes included. */
function devanagariStrings(html: string): string[] {
  const runs = html.match(/[ऀ-ॿ][ऀ-ॿ\s,.…?!'"-]*/g) ?? [];
  return [...new Set(runs.map((s) => s.trim()).filter((s) => s.length > 1))];
}

describe('I-03 — /content renders Hindi for a visitor whose locale is hi', () => {
  let hiHtml = '';
  let enHtml = '';

  beforeAll(async () => {
    hiHtml = await renderContent('hi');
    enHtml = await renderContent('en');
  }, 60_000);

  it('sanity: the cookie name asserted here is the one the app stores', () => {
    expect(LOCALE_COOKIE).toBe('poojly_language');
  });

  it('translates the list-header columns the catalogue already carries', () => {
    // hi.json content.views / content.likes — asserted on the page, not the file.
    expect(hiHtml).toContain('दृश्य'); // Views
    expect(hiHtml).toContain('पसंद'); // Likes
    expect(hiHtml).toContain('शीर्षक'); // Title
    expect(hiHtml).toContain('देवता'); // Deity
    expect(hiHtml).toContain('प्रकार'); // Type
  });

  it('translates the filter tabs', () => {
    expect(hiHtml).toContain('आरती'); // Aarti
    expect(hiHtml).toContain('चालीसा'); // Chalisa
    expect(hiHtml).toContain('मंत्र'); // Mantra
    expect(hiHtml).toContain('सभी'); // All
  });

  it('translates the two curated sections above the list', () => {
    expect(hiHtml).toContain('आज का विशेष'); // Today's Featured
    expect(hiHtml).toContain('विशेष संग्रह'); // Curated Collections
    expect(hiHtml).toContain('ट्रैक'); // tracks
  });

  it('translates the empty state, which only a real render reaches', async () => {
    const html = await renderContent('hi', { search: 'zzz-no-such-content-zzz' });
    expect(html).toContain('कोई सामग्री नहीं मिली।'); // No content found.
    expect(html).toContain('कोई अन्य खोज शब्द आजमाएँ।'); // Try a different search term.
  });

  it('translates the section heading, which comes from the ContentType map', async () => {
    const html = await renderContent('hi', { type: 'aarti' });
    expect(html).toContain('आरती');
    // The English label may not survive as the heading of a Hindi page.
    expect(html).not.toContain('>All Aarti<');
  });

  it('serves English unchanged when the visitor has not chosen Hindi', () => {
    // en.json spells the column headers lowercase; the row is CSS-uppercased.
    expect(enHtml).toContain('views');
    expect(enHtml).toContain('likes');
    expect(enHtml).toContain('Curated Collections');
    // The apostrophe in "Today's Featured" is HTML-escaped on the way out.
    expect(enHtml).toMatch(/Today(&#x27;|&#39;|')s Featured/);
    expect(enHtml).toContain('Curated daily devotional content');
    expect(devanagariStrings(enHtml).filter((s) => s !== 'हिन्दी')).toEqual([]);
  });

  it('renders enough distinct Hindi that a regression to three labels fails', () => {
    const strings = devanagariStrings(hiHtml);
    expect(
      strings.length,
      `only ${strings.length} distinct Hindi strings rendered: ${strings.join(' | ')}`,
    ).toBeGreaterThanOrEqual(15);
  });
});

/**
 * The defect was a SECOND label store living next to the catalog. One store is
 * the fix; two is the bug coming back. CONTENT_LABELS survives in
 * components/LanguageSwitcher.tsx only as the provenance corpus
 * __tests__/i18n-hi-catalog.test.ts reads — no product code may render from it.
 *
 * Source text is scanned here, so comments are stripped FIRST. Without that the
 * docblock explaining why the map must not be imported would itself trip the
 * assertion, and a guard that a comment can satisfy or break is not a guard.
 */
describe('I-03 — the component-local label store has no render consumers left', () => {
  const ROOT = process.cwd();

  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...sourceFiles(abs));
      else if (/\.tsx?$/.test(entry.name)) out.push(abs);
    }
    return out;
  }

  it('is imported by no component or route', () => {
    const declaringFile = path.join(ROOT, 'components', 'LanguageSwitcher.tsx');
    const offenders: string[] = [];

    for (const dir of ['app', 'components', 'lib']) {
      const base = path.join(ROOT, dir);
      if (!fs.existsSync(base)) continue;
      for (const file of sourceFiles(base)) {
        if (file === declaringFile) continue;
        if (stripComments(fs.readFileSync(file, 'utf8')).includes('CONTENT_LABELS')) {
          offenders.push(path.relative(ROOT, file));
        }
      }
    }

    expect(offenders, 'these render from the duplicate store instead of lib/t.ts').toEqual([]);
  });

  it('scans stripped source, so the guard cannot be satisfied by a comment', () => {
    // Proof the stripper works: the declaring file's own docblock names the
    // symbol repeatedly, and every one of those occurrences must vanish.
    const src = fs.readFileSync(path.join(ROOT, 'components', 'LanguageSwitcher.tsx'), 'utf8');
    const raw = (src.match(/CONTENT_LABELS/g) ?? []).length;
    const stripped = (stripComments(src).match(/CONTENT_LABELS/g) ?? []).length;
    expect(raw).toBeGreaterThan(stripped);
    expect(stripped).toBe(1); // the declaration itself, and nothing else
  });
});
