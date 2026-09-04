import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../app/ved/[slug]/page';
import { canonicalVedaUrl } from '../app/ved/canonical';
import { VEDAS, getVeda } from '../lib/vedas';
import { canonicalUpanishadUrl } from '../lib/upanishads';
import { getAllArticles } from '../lib/content';

// CI-08, the Veda family.
//
// The Upanishad half of this finding is closed: fourteen /ved articles now
// defer to /upanishads via canonicalUpanishadUrl(). The same collision was
// left open one shelf up — the four Vedas are published twice:
//
//   /vedas/rigveda            lib/vedas.ts, curated: mantra count, shakhas,
//                             the four parts, famous hymns, presiding priest
//   /ved/rigveda-overview     content/ved/rigveda-overview.mdx, a 4-minute
//                             prose article on the same subject
//
// …and both declared themselves canonical, so Google was handed two competing
// originals for one subject, exactly as before. Same ruling as the Upanishad
// half: the curated dataset wins and the MDX article defers to it.
//
// The mapping is DERIVED, not tabulated — every /ved overview slug is
// `<vedaSlug>-overview` and `getVeda` decides whether that Veda exists. A
// hand-written second slug table is the duplication CI-08 exists to remove.

const canonicalOf = async (slug: string) => {
  const m = await generateMetadata({ params: Promise.resolve({ slug }) });
  return m.alternates?.canonical;
};

describe('CI-08 — the four Vedas really are published twice', () => {
  it('every curated Veda has an overview article shadowing it', () => {
    const vedArticles = new Set(getAllArticles('ved').map((a) => a.frontmatter.slug));
    expect(VEDAS).toHaveLength(4);
    for (const v of VEDAS) {
      expect(vedArticles.has(`${v.slug}-overview`), `${v.slug}-overview`).toBe(true);
    }
  });
});

describe('CI-08 — canonicalVedaUrl derives the survivor, it does not tabulate it', () => {
  it('maps every <veda>-overview article onto its curated page', () => {
    for (const v of VEDAS) {
      expect(canonicalVedaUrl(`${v.slug}-overview`)).toBe(`/vedas/${v.slug}`);
    }
  });

  it('returns undefined for a /ved article that is not one of the four Vedas', () => {
    // Both of these are real content/ved articles, and neither has a curated
    // twin — getVeda('aranyakas') and getVeda('brahmanas') are undefined.
    expect(canonicalVedaUrl('aranyakas-overview')).toBeUndefined();
    expect(canonicalVedaUrl('brahmanas-overview')).toBeUndefined();
    expect(canonicalVedaUrl('rigveda-structure')).toBeUndefined();
    expect(canonicalVedaUrl('rigveda')).toBeUndefined();
    expect(canonicalVedaUrl('')).toBeUndefined();
  });

  it('the two suffix-less names it rejects are genuinely absent from the dataset', () => {
    expect(getVeda('aranyakas')).toBeUndefined();
    expect(getVeda('brahmanas')).toBeUndefined();
  });
});

describe('CI-08 — /ved stops competing with /vedas', () => {
  it('each Veda overview article points its canonical at the curated page', async () => {
    for (const v of VEDAS) {
      expect(await canonicalOf(`${v.slug}-overview`)).toBe(
        `https://darshya.online/vedas/${v.slug}`,
      );
    }
  });

  it('leaves the Upanishad deferral it already had intact', async () => {
    expect(await canonicalOf('katha-upanishad')).toBe(
      'https://darshya.online/upanishads/katha-upanishad',
    );
  });

  it('leaves an article with no twin self-canonical', async () => {
    expect(await canonicalOf('aranyakas-overview')).toBe(
      'https://darshya.online/ved/aranyakas-overview',
    );
  });

  it('no /ved article is claimed by both families at once', () => {
    for (const a of getAllArticles('ved')) {
      const slug = a.frontmatter.slug;
      const both = !!canonicalVedaUrl(slug) && !!canonicalUpanishadUrl(slug);
      expect(both, `${slug} is claimed by /vedas AND /upanishads`).toBe(false);
    }
  });

  it('every canonical it emits is a URL this site actually publishes', () => {
    for (const a of getAllArticles('ved')) {
      const target = canonicalVedaUrl(a.frontmatter.slug);
      if (!target) continue;
      expect(getVeda(target.replace('/vedas/', '')), target).toBeDefined();
    }
  });
});
