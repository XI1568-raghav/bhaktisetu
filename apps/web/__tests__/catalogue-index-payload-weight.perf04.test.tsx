import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AARTIS } from '../lib/aartis';
import { CHANTS } from '../lib/chants';
import { FESTIVALS } from '../lib/festivals';

/**
 * [PERF-04 / CWV-01] THE THREE CATALOGUE INDEXES SHIP A PAYLOAD THAT SCALES
 * WITH THE CORPUS INSTEAD OF WITH WHAT THE READER CAN SEE.
 *
 * ── WHAT WAS MEASURED, LIVE PRODUCTION, 2026-09-08 ────────────────────────
 *
 * Every number below was taken from darshya.online with the status code
 * asserted before the body was read (OPS-12/F451: the origin serves Cloudflare
 * block pages under a concurrent burst, and those block pages carry a fake h1,
 * so an unpaced script measures the block page and reports it as the page).
 * Requests were paced 11 s apart with a browser UA; h1 was checked to be the
 * real page heading on every sample.
 *
 *     page        status   raw HTML     gzip      brotli   inline <svg>
 *     /aarti       200     616,628 B   43,758 B  25,423 B      326
 *     /chants      200     419,824 B   66,955 B  36,001 B       25
 *     /calendar    200     382,166 B   70,807 B  31,090 B       25
 *     404          404     116,976 B   18,194 B  12,641 B       26
 *
 * Note the inversion: /aarti has the largest RAW body and the SMALLEST wire
 * body, because 300 byte-identical icons compress to nearly nothing, while
 * /calendar has the smallest raw body and the LARGEST wire body, because its
 * weight is unique prose. Optimising one of these numbers without looking at
 * the other picks the wrong page. The cost that actually lands on a phone is
 * the raw figure — that is what the parser walks, what becomes DOM nodes, and
 * what the hydration payload has to be deserialised from.
 *
 * ── THE MECHANISM: EVERY SERVER-RENDERED ELEMENT IS PAID FOR TWICE ────────
 *
 * Measured share of each document that is `self.__next_f.push` flight payload:
 * /aarti 60.5%, /chants 59.1%, /calendar 58.6%, 404 63.0%. The flight payload
 * is the React tree re-encoded as triple-escaped JSON, and that encoding is
 * *more* verbose than the HTML it duplicates. A single lucide <Music/> costs
 * 369 B of HTML and ~600 B of flight — every quote in
 * `[\"$\",\"svg\",null,{...}]` is escaped to 4 bytes. So the lever that moves
 * these pages is ELEMENT COUNT, not text length, and an element rendered once
 * per corpus row is charged ~1.6x again on top of its markup.
 *
 * ── RULE 1: DECORATIVE ICON GEOMETRY MUST NOT SCALE WITH THE CORPUS ───────
 *
 * app/aarti/page.tsx rendered <Music/>, <Clock/> and <ArrowRight/> INSIDE the
 * map over AARTIS — 100 rows x 3 = 300 full <svg> bodies, each with its own
 * <path>/<circle> children, in the HTML and again in the flight payload. That
 * measured 117,569 B of literal <svg> in the HTML alone (19.1% of the
 * document) for three distinct pictures repeated a hundred times each.
 *
 * The fix is a <symbol> sprite emitted once plus a <use> per row. The icons
 * stay in the DOM, stay aria-hidden, and look identical; only the duplication
 * goes. This test asserts the RULE — geometry does not scale with AARTIS —
 * rather than a byte count, which would flap on any copy edit.
 *
 * ── RULE 2: TEXT INSIDE A line-clamp BOX MUST BE BOUNDED AT THE SOURCE ────
 *
 * `line-clamp-2` is a PAINT instruction, not a transfer instruction. The full
 * string still ships. Measured corpus fields that were being clamped:
 *
 *     lib/chants.ts   meaning      n=96  avg 364  max 735   total 34,985 B
 *     lib/festivals.ts description n=56  avg 419  max 1,341 total 23,480 B
 *
 * Two lines of text-sm in those cards is well under 200 characters at any
 * viewport, so everything past the bound was paid for twice (HTML + flight)
 * and never rendered to a single reader. The full text is not lost: it is the
 * body copy of /chants/[slug] and /festival/[slug], which is where a crawler
 * should be finding it rather than duplicated across an index.
 *
 * ── RULE 3: JSON-LD IS NOT A DUMPING GROUND ──────────────────────────────
 *
 * /calendar's ItemList emitted the untruncated `description` of all 56
 * festivals as Event.description. Measured: 35,010 B of JSON-LD, 9.2% of the
 * document, and — because dangerouslySetInnerHTML content is a prop like any
 * other — the same string again inside the flight payload (the largest single
 * flight push on that page measured 35,201 B). ~70 KB for a field Google
 * truncates well before 200 characters.
 *
 * ── RULE 4: WEIGHT IS NEVER TO BE FIXED BY DELETING ROWS ─────────────────
 *
 * The cheap way to pass rules 1-3 is to stop rendering some of the corpus.
 * That would silently destroy the internal linking these index pages exist to
 * provide. Every rule above is paired with a guard that the full corpus is
 * still linked and still named.
 *
 * ── WHAT THIS FILE DELIBERATELY DOES *NOT* ASSERT ────────────────────────
 *
 * A raw-byte ceiling. Byte counts are reported in the comment above as
 * evidence and re-measured against production; asserting them would turn every
 * copy edit into a red suite, which is how a gate stops meaning anything.
 */

// The calendar index asks the live catalogue which pujas are bookable. That is
// a different finding's concern; pin it so this suite measures payload shape.
vi.mock('../lib/puja-catalogue', () => ({
  getCatalogueSlugs: vi.fn(async () => new Set<string>()),
  catalogueSlugsFromPayload: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

/** SVG elements that actually draw something, as opposed to a <use> reference. */
const GEOMETRY = 'path, circle, polyline, polygon, line, rect, ellipse';

/**
 * Two lines of text-sm/text-xs inside a card is ~110 characters on a desktop
 * card and fewer on a phone. 200 is a deliberately loose ceiling: it is above
 * anything any viewport paints, so it bounds the waste without policing copy.
 */
const CLAMP_MAX = 200;

/** Google truncates rich-result descriptions far below this. */
const LD_DESCRIPTION_MAX = 220;

/**
 * Chrome, not corpus: the page's own header/CTA icons. Anything that scales
 * with AARTIS.length (100) blows straight through this.
 */
const CHROME_ICON_BUDGET = 12;

async function renderAarti() {
  const { default: Page } = await import('../app/aarti/page');
  return render(<Page />);
}
async function renderChants() {
  const { default: Page } = await import('../app/chants/page');
  return render(<Page />);
}
async function renderCalendar() {
  const { default: Page } = await import('../app/calendar/page');
  return render(await Page());
}

function svgsWithGeometry(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('svg')).filter((s) => s.querySelector(GEOMETRY));
}

function clampedElements(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('[class*="line-clamp"]'));
}

function hrefs(container: HTMLElement, prefix: string): string[] {
  return Array.from(container.querySelectorAll('a'))
    .map((a) => a.getAttribute('href') || '')
    .filter((h) => h.startsWith(prefix));
}

/** Every `description` string anywhere in a JSON-LD graph, at any depth. */
function descriptions(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const n of node) descriptions(n, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'description' && typeof v === 'string') out.push(v);
      else descriptions(v, out);
    }
  }
  return out;
}

describe('PERF-04 rule 1 — decorative icon geometry does not scale with the corpus', () => {
  it('the corpus is big enough for per-row icons to matter', () => {
    // Non-vacuity: if AARTIS ever shrank to a handful, the budget below would
    // pass for the wrong reason and this test would stop measuring anything.
    expect(AARTIS.length).toBeGreaterThan(50);
  });

  it('/aarti draws each distinct icon once, not once per aarti', async () => {
    const { container } = await renderAarti();
    const drawn = svgsWithGeometry(container);
    expect(
      drawn.length,
      `${drawn.length} <svg> elements carry their own geometry on a page of ` +
        `${AARTIS.length} aartis — icons are being re-emitted per row`,
    ).toBeLessThanOrEqual(CHROME_ICON_BUDGET);
  });

  it('/aarti still shows an icon on every row, via <use>', async () => {
    const { container } = await renderAarti();
    // The fix must not be "delete the icons". Each row keeps its three.
    expect(container.querySelectorAll('use').length).toBeGreaterThanOrEqual(AARTIS.length);
  });

  it('every sprite <use> resolves to a <symbol> defined on the page', async () => {
    const { container } = await renderAarti();
    const defined = new Set(
      Array.from(container.querySelectorAll('symbol'))
        .map((s) => s.getAttribute('id'))
        .filter((id): id is string => !!id),
    );
    const used = Array.from(container.querySelectorAll('use')).map(
      (u) => u.getAttribute('href') || u.getAttribute('xlink:href') || '',
    );
    expect(used.length).toBeGreaterThan(0);
    for (const ref of used) {
      expect(ref.startsWith('#'), `<use href="${ref}"> is not a same-document reference`).toBe(true);
      expect(defined, `<use href="${ref}"> has no matching <symbol>`).toContain(ref.slice(1));
    }
  });
});

describe('PERF-04 rule 2 — text inside a line-clamp box is bounded at the source', () => {
  it('the corpus really does hold strings far past the clamp', () => {
    // Non-vacuity: this is the waste the rule exists to stop.
    expect(Math.max(...CHANTS.map((c) => c.meaning.length))).toBeGreaterThan(CLAMP_MAX);
    expect(Math.max(...FESTIVALS.map((f) => f.description.length))).toBeGreaterThan(CLAMP_MAX);
  });

  it('/chants clamps its card text at the source', async () => {
    const { container } = await renderChants();
    const clamped = clampedElements(container);
    expect(clamped.length, 'no line-clamp element found — selector has gone stale').toBeGreaterThan(0);
    for (const el of clamped) {
      const text = el.textContent || '';
      expect(
        text.length,
        `${text.length} chars shipped into a 2-line box: "${text.slice(0, 60)}…"`,
      ).toBeLessThanOrEqual(CLAMP_MAX);
    }
  });

  it('/calendar clamps its card text at the source', async () => {
    const { container } = await renderCalendar();
    const clamped = clampedElements(container);
    expect(clamped.length, 'no line-clamp element found — selector has gone stale').toBeGreaterThan(0);
    for (const el of clamped) {
      const text = el.textContent || '';
      expect(
        text.length,
        `${text.length} chars shipped into a 2-line box: "${text.slice(0, 60)}…"`,
      ).toBeLessThanOrEqual(CLAMP_MAX);
    }
  });
});

describe('PERF-04 rule 3 — JSON-LD carries a summary, not the whole body', () => {
  it('the corpus really does hold descriptions far past the bound', () => {
    expect(Math.max(...FESTIVALS.map((f) => f.description.length))).toBeGreaterThan(LD_DESCRIPTION_MAX);
  });

  it('/calendar emits no unbounded description into its structured data', async () => {
    const { container } = await renderCalendar();
    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    expect(blocks.length).toBeGreaterThan(0);
    const all = blocks.flatMap((b) => descriptions(JSON.parse(b.innerHTML)));
    expect(all.length, 'no JSON-LD description found — structure has changed').toBeGreaterThan(0);
    for (const d of all) {
      expect(d.length, `JSON-LD description is ${d.length} chars: "${d.slice(0, 60)}…"`).toBeLessThanOrEqual(
        LD_DESCRIPTION_MAX,
      );
    }
  });
});

describe('PERF-04 rule 4 — weight is never reduced by dropping corpus rows', () => {
  it('/aarti still links and names every aarti', async () => {
    const { container } = await renderAarti();
    const links = new Set(hrefs(container, '/aarti/'));
    for (const a of AARTIS) expect(links, `missing /aarti/${a.slug}`).toContain(`/aarti/${a.slug}`);
    const text = container.textContent || '';
    for (const a of AARTIS) expect(text, `missing name "${a.name}"`).toContain(a.name);
  });

  /**
   * OUT OF LANE, FOUND WHILE WRITING THIS TEST — /chants does not link its
   * whole corpus, and that is a pre-existing defect, not something this pass
   * introduced. Two causes, both untouched here because this lane is page
   * weight only:
   *
   *   1. app/chants/page.tsx `sections` lists six category keys, but
   *      `Chant['category']` (lib/chants.ts:9) is a NINE-member union. The
   *      four chants tagged shaiva / shakta / vaishnava — shiva-panchakshara-
   *      stotra, soundarya-lahari-opening, mahishasura-mardini-stotram,
   *      om-namo-narayanaya-ashtakshari — match no section and are rendered by
   *      nothing. Adding a category to the union silently orphans it.
   *   2. lib/chants.ts declares 96 entries but only 95 distinct slugs:
   *      `medha-suktam` appears twice, so two cards point at one URL (and
   *      React sees a duplicate key).
   *
   * 96 - 4 orphaned - 1 duplicate href = the 91 links the page actually
   * renders. So this test asserts the invariant that IS in scope — nothing
   * the page undertakes to render may be dropped to save weight — rather than
   * encoding a bug as if it were the specification.
   */
  it('/chants still links and names every chant it undertakes to render', async () => {
    const { container } = await renderChants();
    const { default: _page } = await import('../app/chants/page');
    void _page;
    const RENDERED_CATEGORIES = new Set(['protection', 'wisdom', 'wealth', 'peace', 'devotional', 'invocation']);
    const shown = CHANTS.filter((c) => RENDERED_CATEGORIES.has(c.category));
    expect(shown.length).toBeGreaterThan(50);
    const links = new Set(hrefs(container, '/chants/'));
    for (const c of shown) expect(links, `missing /chants/${c.slug}`).toContain(`/chants/${c.slug}`);
    const text = container.textContent || '';
    for (const c of shown) expect(text, `missing name "${c.name}"`).toContain(c.name);
  });

  it('/calendar still links and names every festival', async () => {
    const { container } = await renderCalendar();
    const links = new Set(hrefs(container, '/festival/'));
    for (const f of FESTIVALS) expect(links, `missing /festival/${f.slug}`).toContain(`/festival/${f.slug}`);
    const text = container.textContent || '';
    for (const f of FESTIVALS) expect(text, `missing name "${f.name}"`).toContain(f.name);
  });

  it('/calendar keeps every festival in its structured data', async () => {
    const { container } = await renderCalendar();
    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
    const json = JSON.stringify(blocks.map((b) => JSON.parse(b.innerHTML)));
    // Truncating a description must not remove the Event it belongs to.
    const inYear = FESTIVALS.filter((f) => f.date2026.startsWith('2026-'));
    for (const f of inYear) expect(json, `missing Event for ${f.slug}`).toContain(`/festival/${f.slug}`);
  });
});

describe('PERF-04 — the 404 route ships no site chrome of its own', () => {
  /**
   * MEASURED, PRODUCTION, 2026-09-08: the 404 body is 116,976 B, of which
   * 73,682 B (63.0%) is flight payload, and it contains 2 <nav> and 1 <footer>
   * with 26 inline <svg>. The finding's title clause ("weighs 200-260 KB") is
   * closed — it is 117 KB — but the prescribed fix ("does not need the
   * mega-nav, footer, or 100+ inline SVG icons") is only half done: the icon
   * count is down from 100+ to 26, and the nav and footer are still there.
   *
   * They are NOT coming from this file. app/not-found.tsx renders one 56px
   * SVG and no chrome at all — everything below passes on the current tree.
   * In the App Router the root not-found.tsx is unavoidably wrapped in
   * app/layout.tsx, which is where the mega-nav and footer are rendered, and
   * escaping it needs one of two changes that are both outside this lane:
   *
   *   1. `experimental.globalNotFound: true` in next.config.ts plus an
   *      app/global-not-found.tsx. The config flag is the whole mechanism —
   *      adding the file without it produces an inert file that silently does
   *      nothing, which is worse than not adding it.
   *   2. Moving the site's routes under a route group whose layout carries the
   *      chrome, leaving the root layout bare. That is a repo-wide move.
   *
   * Both are owner decisions. What this suite can do is stop the 404 from
   * regrowing chrome of its own, which is the half that lives in this file.
   */
  it('not-found.tsx renders no nav, no footer and one icon', async () => {
    const { default: NotFound } = await import('../app/not-found');
    const { container } = render(<NotFound />);
    expect(container.querySelectorAll('nav').length).toBe(0);
    expect(container.querySelectorAll('footer').length).toBe(0);
    expect(svgsWithGeometry(container).length).toBeLessThanOrEqual(2);
  });

  it('not-found.tsx still does its job — search box plus real destinations', async () => {
    const { default: NotFound } = await import('../app/not-found');
    const { container } = render(<NotFound />);
    // A lighter 404 must stay a useful one; this is the guard on rule 4 for
    // the 404 route.
    expect(container.querySelector('form[action="/search"]')).toBeTruthy();
    expect(hrefs(container, '/pujas/').length).toBeGreaterThan(0);
    expect(hrefs(container, '/temples/').length).toBeGreaterThan(0);
  });
});
