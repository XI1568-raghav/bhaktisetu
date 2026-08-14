// [SEO-04] Every page emitted the HOMEPAGE's social card (prod sweep 2026-08-12).
//
// 1,652 of 1,785 prerendered pages carried `twitter:title = "Darshya — India's
// Devotional Super App"`, and 158 sitemap URLs — /temples, /pujas, /darshan,
// /astrology, 9 /yatra/[slug], 30 /tithi/[slug], 24 /ekadashi/[slug] — carried
// the homepage's Open Graph card *including* `og:url=https://darshya.online`.
// Devotional content spreads on WhatsApp and X. Sharing the Vishnu Aarti page
// produced a card that said nothing about Vishnu Aarti and a URL that resolved
// to the homepage.
//
// This is NOT a "each page forgot to set twitter" bug — it is a mechanism bug,
// so the tests below drive Next.js' OWN resolver rather than grepping for tags.
// The mechanism, from next/dist/lib/metadata/resolve-metadata.js:
//
//   mergeMetadata:        `for (const key_ in source)` — a route that never
//                         writes `twitter` inherits the parent's resolved
//                         twitter object wholesale. Next does NOT rebuild it
//                         from that route's own openGraph.
//   postProcessMetadata:  runs last, on the merged object, and back-fills
//                         twitter from openGraph — but only `if (!hasTwTitle)`,
//                         `if (!hasTwDescription)`, `if (!hasTwImages)`.
//   resolveOpenGraph:     `resolved.url = openGraph.url ? resolveAbsolute… :
//                         null`, and resolveRelativeUrl() turns a leading './'
//                         into the CURRENT pathname.
//
// So the fix is to leave the content keys empty at the root: emptiness is what
// arms the back-fill. A root card that is "filled in properly" is exactly the
// bug. Guard that with behaviour, not with a string match.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_OPEN_GRAPH, SITE_TWITTER, SITE_URL } from '../../lib/site-metadata';
import { organizationJsonLd, articleJsonLd } from '../../lib/jsonld';

// Next's real resolvers — the same functions that run during `next build`.
// If a Next upgrade moves these, this test must fail loudly rather than skip:
// a silently-skipped social-card test is how 1,652 pages got here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as nextOg from 'next/dist/lib/metadata/resolvers/resolve-opengraph';

const { resolveOpenGraph, resolveTwitter } = nextOg as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveOpenGraph: (...args: any[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveTwitter: (...args: any[]) => any;
};

const BASE = new URL(SITE_URL);
const CTX = { trailingSlash: false, isStaticMetadataRouteFile: false } as never;
const WEB_DIR = path.resolve(__dirname, '../..');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function og(pathname: string): Promise<any> {
  return await resolveOpenGraph(SITE_OPEN_GRAPH, BASE, Promise.resolve(pathname), CTX, null);
}

describe('[SEO-04] the root Open Graph card must describe the page, not the homepage', () => {
  it('resolves og:url to the route that is actually being shared', async () => {
    const shared = await og('/aarti/vishnu-aarti');
    expect(
      shared.url,
      'A literal homepage URL on the root openGraph makes every WhatsApp/X share of ' +
        'a deep page resolve to the homepage — the share cannot convert.',
    ).toBe('https://darshya.online/aarti/vishnu-aarti');

    const temples = await og('/temples');
    expect(temples.url).toBe('https://darshya.online/temples');
  });

  it('still resolves og:url to the bare origin on the homepage itself', async () => {
    expect((await og('/')).url).toBe('https://darshya.online');
  });

  it('carries no title or description, so Next fills them from the page', () => {
    // inheritFromMetadata(openGraph, metadata) only assigns when the target is
    // empty. A root value here wins over every child page's own title.
    expect(
      Object.keys(SITE_OPEN_GRAPH),
      'title/description on the root openGraph override every page that does not ' +
        'declare its own openGraph — 158 sitemap URLs at last count.',
    ).not.toContain('title');
    expect(Object.keys(SITE_OPEN_GRAPH)).not.toContain('description');
  });

  it('keeps the site-level keys that are genuinely site-level', () => {
    expect(SITE_OPEN_GRAPH.siteName).toBe('Darshya');
    expect(SITE_OPEN_GRAPH.type).toBe('website');
    expect(SITE_OPEN_GRAPH.locale).toBe('en_IN');
    expect(SITE_OPEN_GRAPH.images.length).toBeGreaterThan(0);
  });
});

describe('[SEO-04] the root Twitter card must carry a card TYPE and no content', () => {
  it('declares only the card type', () => {
    expect(
      Object.keys(SITE_TWITTER).sort(),
      "Any content key here is inherited verbatim by every route that doesn't " +
        'write its own `twitter`, which is 1,456 of them.',
    ).toEqual(['card']);
  });

  it('lets Next mirror the page\'s own openGraph into the Twitter card', () => {
    // Reproduces postProcessMetadata's back-fill branch for a page that sets
    // openGraph but not twitter (the overwhelmingly common shape in this repo).
    const pageOg = {
      title: { absolute: 'Vishnu Aarti — जय जगदीश हरे', template: null },
      description: 'Lyrics, meaning and benefits of the Vishnu Aarti.',
      images: [{ url: new URL('https://darshya.online/og/aarti.jpg') }],
    };
    const hasTwTitle = Boolean(
      (SITE_TWITTER as Record<string, unknown>).title &&
        ((SITE_TWITTER as Record<string, unknown>).title as { absolute?: string }).absolute,
    );
    const hasTwDescription = Boolean((SITE_TWITTER as Record<string, unknown>).description);
    const hasTwImages = Boolean((SITE_TWITTER as Record<string, unknown>).images);

    expect(hasTwTitle, 'blocks the back-fill of twitter:title').toBe(false);
    expect(hasTwDescription, 'blocks the back-fill of twitter:description').toBe(false);
    expect(hasTwImages, 'blocks the back-fill of twitter:image').toBe(false);

    const filled = resolveTwitter(
      { title: pageOg.title, description: pageOg.description, images: pageOg.images },
      BASE,
      CTX,
      null,
    );
    expect(filled.title.absolute).toBe('Vishnu Aarti — जय जगदीश हरे');
    expect(filled.description).toBe('Lyrics, meaning and benefits of the Vishnu Aarti.');
  });
});

describe('[SEO-04] app/layout.tsx must use the shared defaults, not its own literals', () => {
  const src = fs.readFileSync(path.join(WEB_DIR, 'app/layout.tsx'), 'utf8');

  it('imports them from lib/site-metadata', () => {
    expect(src).toMatch(/from\s+["']\.\.\/lib\/site-metadata["']/);
    expect(src).toMatch(/SITE_OPEN_GRAPH/);
    expect(src).toMatch(/SITE_TWITTER/);
  });

  it('declares no inline openGraph/twitter object literal that could drift', () => {
    // `openGraph: SITE_OPEN_GRAPH,` is fine; `openGraph: {` is the drift.
    const inline = [/openGraph\s*:\s*\{/, /twitter\s*:\s*\{/].filter((re) => re.test(src));
    expect(
      inline.map(String),
      'Two sources of truth for the site card is how the card and the page drifted apart.',
    ).toEqual([]);
  });
});

describe('[SEO-04] a route that declares openGraph must declare its image too', () => {
  // Next merges metadata one KEY at a time, so a route that writes `openGraph`
  // REPLACES the root's entirely — it does not inherit `images` from it. 101
  // routes therefore had no og:image at all and were showing a card image on X
  // only because the root twitter block leaked the homepage's picture into
  // them. Removing that leak (the fix above) would have left those pages with
  // no card image anywhere, so each now names the site default explicitly.
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, acc);
      else if (e.name === 'page.tsx' || e.name === 'layout.tsx') acc.push(full);
    }
    return acc;
  }

  it('every openGraph block names an image', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(WEB_DIR, 'app'))) {
      const src = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const m of src.matchAll(/\bopenGraph\s*:\s*\{/g)) {
        // scan to the matching close brace
        let depth = 0;
        let end = src.length;
        for (let i = m.index + m[0].length - 1; i < src.length; i++) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}' && --depth === 0) {
            end = i;
            break;
          }
        }
        const body = src.slice(m.index, end);
        if (!/(^|[^\w$.])images\s*:/.test(body)) {
          offenders.push(
            `${path.relative(WEB_DIR, file).split(path.sep).join('/')}:${
              src.slice(0, m.index).split('\n').length
            }`,
          );
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} routes declare openGraph without an image, so their WhatsApp ` +
        'and X share cards render with no picture at all.',
    ).toEqual([]);
  });
});

describe('[SEO-04] the Organization logo must be a file that exists', () => {
  // Organization JSON-LD ships in <head> on EVERY page. It pointed at
  // /logo.png, which 404s — denying Google a logo for knowledge-panel
  // eligibility on all 1,785 pages at once.
  const logoUrls = [
    organizationJsonLd.logo,
    (articleJsonLd({ title: 't', url: SITE_URL }).publisher.logo as { url: string }).url,
  ];

  for (const url of logoUrls) {
    it(`${url} resolves to a file in public/`, () => {
      expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
      const rel = url.slice(SITE_URL.length + 1);
      const abs = path.join(WEB_DIR, 'public', rel);
      expect(fs.existsSync(abs), `public/${rel} does not exist — this URL 404s in production`).toBe(
        true,
      );
    });
  }
});
