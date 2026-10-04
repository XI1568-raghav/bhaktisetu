/**
 * [SEO-11] (prod sweep 2026-09-08) — the <head> a temple/puja detail page emits
 * for a slug it is about to 404 on.
 *
 * MEASURED ON PROD before the fix, status asserted before the body was read:
 *
 *   GET /temples/zz-probe-…            -> HTTP 200
 *     <title>Temple — ,  | Darshya</title>          both interpolations empty
 *     <link rel="canonical" href="https://darshya.online/temples/zz-probe-…">
 *     <meta name="robots" content="index, follow">  inherited from app/layout
 *     <meta name="robots" content="noindex">        injected by Next
 *
 *   GET /pujas/zz-probe-…              -> HTTP 200
 *     <title>Puja not found | Darshya | Darshya</title>
 *
 * Three separate defects in one head: an empty title, a canonical asserting a
 * URL that does not exist is the real one, and two robots directives that
 * contradict each other. Google resolves the conflict by taking the most
 * restrictive, so `noindex` won and nothing was indexed — the cost was crawl
 * budget over an unbounded slug space plus a broken title on every link
 * preview and unfurl that renders the head.
 *
 * These tests call the real `generateMetadata` of both routes with a slug that
 * cannot resolve, with `fetch` stubbed to the 404 the API genuinely returns.
 * They assert the head, not the markup. The 200 STATUS is a different defect
 * with a different cause and is guarded separately in ./soft-404-status.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { TITLE_TEMPLATE, SITE_NAME } from '../../lib/seo/title-template';

/** A slug no data source can resolve, in the shape a crawler or typo produces. */
const BOGUS = 'definitely-not-a-real-slug-xyz';

const LAYOUT_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../app/layout.tsx'),
  'utf8',
);

/** `Metadata['title']` is `string | TemplateString | null`; these routes use plain strings. */
function titleOf(m: Metadata): string {
  const t = m.title;
  expect(typeof t, 'the not-found title must be a plain string so the root template brands it').toBe(
    'string',
  );
  return t as string;
}

function robotsIndexOf(m: Metadata): unknown {
  const r = m.robots;
  expect(r, 'the page must declare its own robots rather than inherit the root layout default').toBeTruthy();
  return (r as { index?: unknown }).index;
}

/** Stub every network call these resolvers make with the API's real 404. */
function stubApi404() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ code: 'NOT_FOUND' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

// ──────────────────────────────────────────────────────────────
// The anchor that makes every robots assertion below non-vacuous.
// ──────────────────────────────────────────────────────────────

describe('[SEO-11] the root layout is why an undeclared robots means "index, follow"', () => {
  it('app/layout.tsx still declares robots index:true / follow:true', () => {
    // If this ever stops being true, a page that simply omits `robots` would no
    // longer inherit an indexable directive, and the "no conflicting pair"
    // assertions below would pass for the wrong reason. Asserting it here keeps
    // those tests honest rather than accidentally vacuous.
    expect(LAYOUT_SRC).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true,?\s*\}/);
  });
});

// ──────────────────────────────────────────────────────────────
// /temples/[slug]
// ──────────────────────────────────────────────────────────────

describe('[SEO-11] /temples/[slug] — the head for a slug that will 404', () => {
  let meta: Metadata;

  beforeEach(async () => {
    stubApi404();
    vi.resetModules();
    const mod = await import('../../app/temples/[slug]/page');
    meta = await mod.generateMetadata({ params: Promise.resolve({ slug: BOGUS }) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not emit a title built from empty interpolations', () => {
    const title = titleOf(meta);
    // Pre-fix this was `${name} — ${location}` with name falling back to
    // 'Temple' and location resolving to `${''}, ${''}` — literally "Temple — , ".
    expect(title, 'a dangling em-dash + comma is the empty-interpolation shape').not.toMatch(/—\s*,/);
    expect(title.trim(), 'a title must not end on a separator').not.toMatch(/[—,]$/);
    expect(title.trim().length).toBeGreaterThan(4);
  });

  it('does not carry the brand — the root template appends it exactly once', () => {
    const title = titleOf(meta);
    expect(title).not.toContain(SITE_NAME);
    const rendered = TITLE_TEMPLATE.replace('%s', title);
    expect(rendered.split(SITE_NAME).length - 1).toBe(1);
  });

  it('declares noindex rather than inheriting the root layout indexable default', () => {
    // The page cannot stop Next injecting its own <meta robots="noindex"> for a
    // caught notFound(). What it CAN do is not sit an "index, follow" next to it.
    expect(robotsIndexOf(meta)).toBe(false);
  });

  it('does not self-canonicalise the URL it is 404ing', () => {
    expect((meta.alternates as { canonical?: unknown } | undefined)?.canonical).toBeUndefined();
  });

  it('leaks the unresolvable slug into no URL in the head at all', () => {
    // Canonical, og:url and the dynamic OG card path all interpolated the slug
    // before the fix, so this one assertion covers every re-introduction route.
    expect(JSON.stringify(meta)).not.toContain(BOGUS);
  });

  it('publishes no social card for a page that does not exist', () => {
    expect(meta.openGraph).toBeUndefined();
    expect(meta.twitter).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// /pujas/[slug]
// ──────────────────────────────────────────────────────────────

describe('[SEO-11] /pujas/[slug] — the head for a slug that will 404', () => {
  let meta: Metadata;

  beforeEach(async () => {
    stubApi404();
    vi.resetModules();
    const mod = await import('../../app/pujas/[slug]/page');
    meta = await mod.generateMetadata({ params: Promise.resolve({ slug: BOGUS }) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not carry the brand — prod served "Puja not found | Darshya | Darshya"', () => {
    const title = titleOf(meta);
    expect(title).not.toContain(SITE_NAME);
    const rendered = TITLE_TEMPLATE.replace('%s', title);
    expect(rendered.split(SITE_NAME).length - 1).toBe(1);
  });

  it('declares noindex rather than inheriting the root layout indexable default', () => {
    expect(robotsIndexOf(meta)).toBe(false);
  });

  it('does not self-canonicalise the URL it is 404ing', () => {
    expect((meta.alternates as { canonical?: unknown } | undefined)?.canonical).toBeUndefined();
    expect(JSON.stringify(meta)).not.toContain(BOGUS);
  });

  it('publishes no social card for a page that does not exist', () => {
    expect(meta.openGraph).toBeUndefined();
    expect(meta.twitter).toBeUndefined();
  });
});
